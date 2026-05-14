import { spawn } from "node:child_process";
import chalk from "chalk";
import { readStore, writeStore, applyToSettings } from "../lib/store.js";
import { buildConfigChoices, numberedSelect } from "../lib/prompts.js";
import { SETTINGS_PATH } from "../lib/settings.js";
import type { Command } from "commander";

export function registerUseCommand(program: Command): void {
  program
    .command("use [name]")
    .description("Switch active configuration")
    .option("-p, --previous", "Switch to the previous configuration")
    .option("-l, --launch", "Launch claude after switching")
    .action(useCommand);
}

export async function useCommand(
  name?: string,
  opts?: { previous?: boolean; launch?: boolean },
): Promise<void> {
  const store = await readStore();
  const names = Object.keys(store.providers);

  if (names.length === 0) {
    console.log(chalk.yellow("No configurations found. Run `ccm add` to create one."));
    return;
  }

  let target = name;

  // --previous: switch to the last active config
  if (opts?.previous) {
    if (!store.previousActive || !store.providers[store.previousActive]) {
      console.log(chalk.yellow("No previous configuration to switch to."));
      return;
    }
    target = store.previousActive;
    console.log(chalk.dim(`Switching back to "${target}"…`));
  }

  if (!target) {
    target = await numberedSelect({
      message: "Select a configuration to activate:",
      choices: buildConfigChoices(store, { activeLabel: "current" }),
    });
  }

  if (!store.providers[target]) {
    console.log(chalk.red(`Configuration "${target}" not found.`));
    process.exit(1);
  }

  // Resolve outgoing provider's env for precise cleanup
  const previousEnv = store.active ? store.providers[store.active]?.env : undefined;

  // Apply to settings.json (clears outgoing provider keys first)
  await applyToSettings(store.providers[target].env, previousEnv);

  // Track previous active config
  if (store.active && store.active !== target) {
    store.previousActive = store.active;
  }

  // Update active in store
  store.active = target;
  await writeStore(store);

  console.log(chalk.green(`Switched to "${target}".`));
  console.log(chalk.dim(`Settings written to ${SETTINGS_PATH}`));

  if (opts?.launch) {
    console.log(chalk.dim("Launching claude…"));
    spawn("claude", [], { stdio: "inherit", shell: true });
  }
}
