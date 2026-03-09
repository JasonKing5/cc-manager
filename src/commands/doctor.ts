import { createRequire } from "node:module";
import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
import { readStore } from "../lib/store.js";
import { readSettings, SETTINGS_PATH } from "../lib/settings.js";
import { findTemplate } from "../lib/providers.js";
import type { Command } from "commander";

const require = createRequire(import.meta.url);

const STORE_PATH = join(homedir(), ".claude", "ccm.json");

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Diagnose configuration issues")
    .option("--test-api", "Test API connectivity")
    .action(doctorCommand);
}

export async function doctorCommand(opts?: {
  testApi?: boolean;
}): Promise<void> {
  const pkg = require("../../package.json") as { version: string };
  let issues = 0;

  console.log("");
  console.log(chalk.bold("  ccm doctor"));
  console.log(chalk.dim("  ─────────────────────────────"));

  // Environment
  console.log("");
  console.log(chalk.bold("  Environment"));
  console.log(`    ccm version:  ${chalk.cyan(pkg.version)}`);
  console.log(`    Node.js:      ${chalk.cyan(process.version)}`);
  console.log(`    Platform:     ${chalk.cyan(`${process.platform} ${process.arch}`)}`);

  // File checks
  console.log("");
  console.log(chalk.bold("  Files"));

  const storeExists = await fileExists(STORE_PATH);
  printCheck(storeExists, `ccm.json  ${chalk.dim(STORE_PATH)}`);
  if (!storeExists) issues++;

  const settingsExists = await fileExists(SETTINGS_PATH);
  printCheck(settingsExists, `settings.json  ${chalk.dim(SETTINGS_PATH)}`);
  if (!settingsExists) issues++;

  // Store validation
  console.log("");
  console.log(chalk.bold("  Store"));

  const store = await readStore();
  const names = Object.keys(store.providers);
  printCheck(names.length > 0, `${names.length} configuration(s) found`);
  if (names.length === 0) issues++;

  if (store.active) {
    const activeExists = !!store.providers[store.active];
    printCheck(activeExists, `Active: "${store.active}"`);
    if (!activeExists) {
      issues++;
      console.log(chalk.red(`      Active config "${store.active}" not found in providers!`));
    }
  } else {
    printCheck(false, "No active configuration");
    issues++;
  }

  // Active config validation
  if (store.active && store.providers[store.active]) {
    const provider = store.providers[store.active];
    const template = provider.provider ? findTemplate(provider.provider) : undefined;

    console.log("");
    console.log(chalk.bold("  Active Configuration"));

    if (template) {
      console.log(`    Provider: ${chalk.cyan(template.name)}`);

      // Check required fields
      for (const field of template.envFields) {
        if (field.fixed) continue;
        if (field.required) {
          const hasValue = !!provider.env[field.key];
          printCheck(hasValue, `${field.label} (${field.key})`);
          if (!hasValue) issues++;
        }
      }
    }

    const hasModels = provider.models.length > 0;
    printCheck(hasModels, `${provider.models.length} model(s) configured`);
    if (!hasModels) issues++;

    if (provider.env.ANTHROPIC_MODEL) {
      const modelInList = provider.models.some(
        (m) => m.value === provider.env.ANTHROPIC_MODEL,
      );
      printCheck(
        modelInList,
        `Active model "${provider.env.ANTHROPIC_MODEL}" is in model list`,
      );
      if (!modelInList) issues++;
    }

    // Settings sync check
    const settings = await readSettings();
    const settingsModel = settings.env?.ANTHROPIC_MODEL;
    const storeModel = provider.env.ANTHROPIC_MODEL;
    const modelsInSync = settingsModel === storeModel;
    printCheck(modelsInSync, "settings.json in sync with active config");
    if (!modelsInSync) {
      issues++;
      console.log(
        chalk.yellow(
          `      Store model: ${storeModel ?? "(none)"}, Settings model: ${settingsModel ?? "(none)"}`,
        ),
      );
      console.log(chalk.dim("      Run `ccm use` to re-sync."));
    }
  }

  // API connectivity test
  if (opts?.testApi && store.active && store.providers[store.active]) {
    console.log("");
    console.log(chalk.bold("  API Connectivity"));
    const provider = store.providers[store.active];
    const token = provider.env.ANTHROPIC_AUTH_TOKEN;
    const baseUrl = provider.env.ANTHROPIC_BEDROCK_BASE_URL;

    if (token && baseUrl) {
      const apiBase = baseUrl.replace(/\/bedrock\/?$/, "");
      try {
        const res = await fetch(`${apiBase}/key/info`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        });
        printCheck(res.ok, `${apiBase}/key/info → ${res.status}`);
        if (!res.ok) issues++;
      } catch (err: any) {
        printCheck(false, `${apiBase} → ${err.message}`);
        issues++;
      }
    } else {
      console.log(chalk.dim("    Skipped: no API key or proxy URL in active config."));
    }
  }

  // Summary
  console.log("");
  if (issues === 0) {
    console.log(chalk.green("  All checks passed!"));
  } else {
    console.log(chalk.yellow(`  ${issues} issue(s) found.`));
  }
  console.log("");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function printCheck(ok: boolean, label: string): void {
  const icon = ok ? chalk.green("✓") : chalk.red("✗");
  console.log(`    ${icon} ${label}`);
}
