import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { readSettings, writeSettings } from "../lib/settings.js";
import { MODEL_CHOICES } from "../lib/models.js";

export async function modelCommand(): Promise<void> {
  const settings = await readSettings();

  if (!settings.env?.ANTHROPIC_AUTH_TOKEN) {
    console.log(
      chalk.yellow(
        "No API Key found. Please run `ccm login` first to configure your credentials.",
      ),
    );
    process.exit(1);
  }

  const currentModel = settings.env?.ANTHROPIC_MODEL;
  if (currentModel) {
    console.log(chalk.dim(`Current model: ${currentModel}`));
  }

  const chosen = await select({
    message: "Select a model:",
    choices: MODEL_CHOICES,
    pageSize: 15,
  });

  settings.env.ANTHROPIC_MODEL = chosen;
  await writeSettings(settings);

  console.log(chalk.green(`✅ Model switched to ${chalk.bold(chosen)}`));
}
