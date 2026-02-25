import { select, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { readStore, writeStore, clearSettings } from "../lib/store.js";

export async function removeCommand(name?: string): Promise<void> {
  const store = await readStore();
  const names = Object.keys(store.providers);

  if (names.length === 0) {
    console.log(chalk.yellow("No configurations found."));
    return;
  }

  let target = name;

  if (!target) {
    target = await select({
      message: "Select a configuration to remove:",
      choices: names.map((n) => ({
        name: n === store.active ? `${n} ${chalk.cyan("(active)")}` : n,
        value: n,
      })),
    });
  }

  if (!store.providers[target]) {
    console.log(chalk.red(`Configuration "${target}" not found.`));
    process.exit(1);
  }

  const yes = await confirm({
    message: `Remove "${target}"?`,
    default: false,
  });

  if (!yes) {
    console.log(chalk.dim("Cancelled."));
    return;
  }

  const wasActive = store.active === target;
  delete store.providers[target];

  if (wasActive) {
    store.active = null;
    await writeStore(store);
    await clearSettings();
    console.log(chalk.yellow("Removed active configuration. Settings cleaned up."));
  } else {
    await writeStore(store);
    console.log(chalk.green(`Configuration "${target}" removed.`));
  }
}
