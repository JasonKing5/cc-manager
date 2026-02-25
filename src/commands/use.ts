import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { readStore, writeStore, applyToSettings } from "../lib/store.js";
import { SETTINGS_PATH } from "../lib/settings.js";

export async function useCommand(name?: string): Promise<void> {
  const store = await readStore();
  const names = Object.keys(store.providers);

  if (names.length === 0) {
    console.log(chalk.yellow("No configurations found. Run `ccm add` to create one."));
    return;
  }

  let target = name;

  if (!target) {
    target = await select({
      message: "Select a configuration to activate:",
      choices: names.map((n) => ({
        name: n === store.active ? `${n} ${chalk.cyan("(current)")}` : n,
        value: n,
      })),
    });
  }

  if (!store.providers[target]) {
    console.log(chalk.red(`Configuration "${target}" not found.`));
    process.exit(1);
  }

  // Apply to settings.json (clears stale keys first)
  await applyToSettings(store.providers[target].env);

  // Update active in store
  store.active = target;
  await writeStore(store);

  console.log(chalk.green(`Switched to "${target}".`));
  console.log(chalk.dim(`Settings written to ${SETTINGS_PATH}`));
}
