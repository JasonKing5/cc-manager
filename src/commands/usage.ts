import chalk from "chalk";
import type { Command } from "commander";
import { readSettings } from "../lib/settings.js";
import { readStore } from "../lib/store.js";
import { recordEntry, displayHistory } from "../lib/usage-history.js";

export function registerUsageCommand(program: Command): void {
  program
    .command("usage")
    .description("Query current API key balance and quota")
    .option("-H, --history", "Show usage history")
    .option("-l, --limit <n>", "Number of history entries to show", "7")
    .action(usageCommand);
}

async function usageCommand(opts: {
  history?: boolean;
  limit?: string;
}): Promise<void> {
  const store = await readStore();
  const configName = store.active;

  if (opts.history) {
    if (!configName) {
      console.log(
        chalk.yellow("No active configuration. Run `ccm use` first."),
      );
      process.exit(1);
    }
    await displayHistory(configName, parseInt(opts.limit ?? "7", 10));
    return;
  }

  let token: string | undefined;
  let baseUrl: string | undefined;

  // Try active provider first, fall back to settings.json
  if (configName && store.providers[configName]) {
    const provider = store.providers[configName];
    token = provider.env.ANTHROPIC_AUTH_TOKEN;
    baseUrl = provider.env.ANTHROPIC_BEDROCK_BASE_URL;
  } else {
    const settings = await readSettings();
    token = settings.env?.ANTHROPIC_AUTH_TOKEN;
    baseUrl = settings.env?.ANTHROPIC_BEDROCK_BASE_URL;
  }

  if (!token) {
    console.log(
      chalk.yellow(
        "No API Key found. Run `ccm add` to create a configuration.",
      ),
    );
    process.exit(1);
  }

  // Derive API base from proxy URL (strip /bedrock suffix)
  const apiBase =
    baseUrl?.replace(/\/bedrock\/?$/, "") ?? "https://www.litellm.org";

  let data: any;
  try {
    const res = await fetch(`${apiBase}/key/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.log(
        chalk.red(`API request failed: ${res.status} ${res.statusText}`),
      );
      process.exit(1);
    }

    data = await res.json();
  } catch (err: any) {
    console.log(chalk.red(`Network error: ${err.message}`));
    process.exit(1);
  }

  const info = data.info ?? data;
  const alias = info.key_alias ?? "N/A";
  const spent = Number(info.spend ?? 0);
  const maxBudget = info.max_budget;
  const expires = info.expires;

  const budgetStr =
    maxBudget != null ? `$${Number(maxBudget).toFixed(2)}` : "Unlimited";
  const remainingStr =
    maxBudget != null ? `$${(Number(maxBudget) - spent).toFixed(2)}` : "N/A";
  const expiresStr = expires
    ? new Date(expires).toLocaleString("sv-SE")
    : "Never";

  console.log("");
  console.log(chalk.bold("  Usage Summary"));
  console.log(chalk.dim("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  if (configName) {
    console.log(`  Config:    ${chalk.cyan(configName)}`);
  }
  console.log(`  Alias:      ${chalk.cyan(alias)}`);
  console.log(`  Spent:      ${chalk.yellow(`$${spent.toFixed(2)}`)}`);
  console.log(`  Budget:     ${chalk.green(budgetStr)}`);
  console.log(`  Remaining:  ${chalk.green(remainingStr)}`);
  console.log(`  Expires:    ${chalk.magenta(expiresStr)}`);
  console.log("");

  // Record to history (silently)
  if (configName) {
    try {
      await recordEntry(
        configName,
        spent,
        maxBudget != null ? Number(maxBudget) : null,
      );
    } catch {
      // Don't let history write failure affect main output
    }
  }
}
