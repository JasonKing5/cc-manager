import chalk from "chalk";
import type { Command } from "commander";
import { readSettings, writeSettings } from "../lib/settings.js";
import { numberedSelect } from "../lib/prompts.js";

export function registerModeCommand(program: Command): void {
  program
    .command("mode")
    .description("Switch Claude Code execution mode (plan / act)")
    .action(modeCommand);
}

async function modeCommand(): Promise<void> {
  const settings = await readSettings();
  const perms = settings.permissions ?? {};
  const current: string = perms.defaultMode ?? "plan";

  console.log(chalk.dim(`Current mode: ${chalk.bold(current)}\n`));

  const selected = await numberedSelect<string>({
    message: "Select execution mode",
    choices: [
      {
        name: `plan  ${chalk.dim("— Ask before dangerous operations")}`,
        value: "plan",
      },
      {
        name: `act   ${chalk.dim("— Execute directly without confirmation")}`,
        value: "act",
      },
    ],
    default: current,
  });

  if (selected === current) {
    console.log(chalk.dim(`Mode unchanged (${current}).`));
    return;
  }

  settings.permissions = { ...perms, defaultMode: selected };
  await writeSettings(settings);
  console.log(chalk.green(`\nMode set to ${chalk.bold(selected)}.`));
}
