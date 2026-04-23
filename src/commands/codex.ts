import { input, password } from "@inquirer/prompts";
import chalk from "chalk";
import type { Command } from "commander";
import {
  readCodexStore,
  writeCodexStore,
  applyCodexConfig,
  type CodexConfig,
  type CodexStore,
} from "../lib/codex-store.js";
import { numberedSelect, styledConfirm } from "../lib/prompts.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function buildCodexChoices(
  store: CodexStore,
): { name: string; value: string; description?: string }[] {
  return Object.keys(store.configs).map((n) => {
    const c = store.configs[n];
    const isActive = n === store.active;
    return {
      name: isActive ? `${n} ${chalk.cyan("(active)")}` : n,
      value: n,
      description: chalk.dim(`${domainOf(c.baseUrl)} · ${maskKey(c.apiKey)}`),
    };
  });
}

// ─── Sub-commands ─────────────────────────────────────────────────────────────

async function codexAddCommand(): Promise<void> {
  const store = await readCodexStore();

  // Name
  const name = await input({
    message: "Configuration name:",
    default: "relay",
    validate: (val) => {
      if (!val.trim()) return "Name cannot be empty.";
      if (store.configs[val.trim()]) return `"${val.trim()}" already exists.`;
      return true;
    },
  });

  // Base URL
  const baseUrl = await input({
    message: "Base URL:",
    validate: (val) => (val.trim() ? true : "Base URL cannot be empty."),
  });

  // API Key
  const apiKeyRaw = await password({
    message: "OPENAI_API_KEY:",
    mask: "*",
  });
  const apiKey = apiKeyRaw.trim();

  if (!apiKey) {
    console.log(chalk.red("Error: API key cannot be empty."));
    process.exit(1);
  }

  const trimmedName = name.trim();
  const config: CodexConfig = {
    name: trimmedName,
    baseUrl: baseUrl.trim(),
    apiKey,
  };

  store.configs[trimmedName] = config;

  const shouldActivate = await styledConfirm("Activate this configuration now?");

  if (shouldActivate) {
    store.active = trimmedName;
    await writeCodexStore(store);
    await applyCodexConfig(config);
    console.log(chalk.green(`Codex configuration "${trimmedName}" created and activated.`));
    console.log(chalk.dim("Written to ~/.codex/auth.json and ~/.codex/config.toml"));
  } else {
    await writeCodexStore(store);
    console.log(chalk.green(`Codex configuration "${trimmedName}" created.`));
  }
}

async function codexListCommand(): Promise<void> {
  const store = await readCodexStore();
  const names = Object.keys(store.configs);

  if (names.length === 0) {
    console.log(chalk.dim("No codex configurations found. Run `ccm codex add` to create one."));
    return;
  }

  console.log();
  for (const n of names) {
    const c = store.configs[n];
    const isActive = n === store.active;
    const marker = isActive ? chalk.green("●") : chalk.dim("○");
    const nameStr = isActive ? chalk.bold(n) : n;
    const meta = chalk.dim(`${domainOf(c.baseUrl)} · ${maskKey(c.apiKey)}`);
    console.log(`  ${marker}  ${nameStr.padEnd(20)} ${meta}`);
  }
  console.log();
}

async function codexUseCommand(name?: string): Promise<void> {
  const store = await readCodexStore();
  const names = Object.keys(store.configs);

  if (names.length === 0) {
    console.log(chalk.yellow("No codex configurations found. Run `ccm codex add` first."));
    return;
  }

  let target = name?.trim();

  if (!target) {
    target = await numberedSelect({
      message: "Select codex configuration to activate:",
      choices: buildCodexChoices(store),
    });
  } else if (!store.configs[target]) {
    console.log(chalk.red(`Configuration "${target}" not found.`));
    process.exit(1);
  }

  store.active = target;
  await writeCodexStore(store);
  await applyCodexConfig(store.configs[target]);
  console.log(chalk.green(`Codex configuration "${target}" activated.`));
  console.log(chalk.dim("Written to ~/.codex/auth.json and ~/.codex/config.toml"));
}

async function codexEditCommand(name?: string): Promise<void> {
  const store = await readCodexStore();
  const names = Object.keys(store.configs);

  if (names.length === 0) {
    console.log(chalk.yellow("No codex configurations found. Run `ccm codex add` first."));
    return;
  }

  let target = name?.trim();

  if (!target) {
    target = await numberedSelect({
      message: "Select configuration to edit:",
      choices: buildCodexChoices(store),
    });
  } else if (!store.configs[target]) {
    console.log(chalk.red(`Configuration "${target}" not found.`));
    process.exit(1);
  }

  const config = store.configs[target];

  const field = await numberedSelect<"name" | "baseUrl" | "apiKey" | "done">({
    message: `Editing "${target}" — what to change?`,
    choices: [
      { name: `Name           ${chalk.dim(config.name)}`, value: "name" },
      { name: `Base URL       ${chalk.dim(domainOf(config.baseUrl))}`, value: "baseUrl" },
      { name: `API Key        ${chalk.dim(maskKey(config.apiKey))}`, value: "apiKey" },
      { name: chalk.dim("Done"), value: "done" },
    ],
  });

  if (field === "done") return;

  if (field === "name") {
    const newName = await input({
      message: "New name:",
      default: config.name,
      validate: (val) => {
        if (!val.trim()) return "Name cannot be empty.";
        if (val.trim() !== target && store.configs[val.trim()]) return `"${val.trim()}" already exists.`;
        return true;
      },
    });
    const trimmed = newName.trim();
    if (trimmed !== target) {
      store.configs[trimmed] = { ...config, name: trimmed };
      delete store.configs[target];
      if (store.active === target) store.active = trimmed;
      target = trimmed;
    }
  } else if (field === "baseUrl") {
    const newUrl = await input({
      message: "Base URL:",
      default: config.baseUrl,
      validate: (val) => (val.trim() ? true : "Base URL cannot be empty."),
    });
    store.configs[target].baseUrl = newUrl.trim();
  } else if (field === "apiKey") {
    const newKey = await password({
      message: "OPENAI_API_KEY:",
      mask: "*",
      validate: (val) => (val.trim() ? true : "API key cannot be empty."),
    });
    store.configs[target].apiKey = newKey.trim();
  }

  await writeCodexStore(store);
  console.log(chalk.green(`Configuration "${target}" updated.`));

  if (store.active === target) {
    const reapply = await styledConfirm("Re-apply to ~/.codex files now?");
    if (reapply) {
      await applyCodexConfig(store.configs[target]);
      console.log(chalk.dim("Written to ~/.codex/auth.json and ~/.codex/config.toml"));
    }
  }
}

async function codexRemoveCommand(name?: string): Promise<void> {
  const store = await readCodexStore();
  const names = Object.keys(store.configs);

  if (names.length === 0) {
    console.log(chalk.yellow("No codex configurations found."));
    return;
  }

  let target = name?.trim();

  if (!target) {
    target = await numberedSelect({
      message: "Select configuration to remove:",
      choices: buildCodexChoices(store),
    });
  } else if (!store.configs[target]) {
    console.log(chalk.red(`Configuration "${target}" not found.`));
    process.exit(1);
  }

  const confirmed = await styledConfirm(`Remove "${target}"?`, false);
  if (!confirmed) {
    console.log(chalk.dim("Cancelled."));
    return;
  }

  delete store.configs[target];
  if (store.active === target) store.active = null;

  await writeCodexStore(store);
  console.log(chalk.green(`Configuration "${target}" removed.`));
  if (store.active === null) {
    console.log(chalk.dim("Note: ~/.codex files were not modified."));
  }
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerCodexCommand(program: Command): void {
  const codex = program
    .command("codex")
    .description("Manage Codex (OpenAI-compatible) configurations");

  codex
    .command("add")
    .description("Add a new Codex configuration")
    .action(codexAddCommand);

  codex
    .command("list")
    .alias("ls")
    .description("List all Codex configurations")
    .action(codexListCommand);

  codex
    .command("use [name]")
    .description("Activate a Codex configuration (writes to ~/.codex files)")
    .action(codexUseCommand);

  codex
    .command("edit [name]")
    .description("Edit a Codex configuration")
    .action(codexEditCommand);

  codex
    .command("remove [name]")
    .alias("rm")
    .description("Remove a Codex configuration")
    .action(codexRemoveCommand);
}
