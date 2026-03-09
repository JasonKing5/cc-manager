import readline from "node:readline";
import chalk from "chalk";
import { readStore, writeStore, applyToSettings } from "../lib/store.js";
import { buildSelectChoices } from "../lib/models.js";
import { numberedSelect } from "../lib/prompts.js";

export async function modelCommand(): Promise<void> {
  const store = await readStore();

  if (!store.active || !store.providers[store.active]) {
    console.log(
      chalk.yellow(
        "No active configuration. Run `ccm add` to create one, or `ccm use` to activate one.",
      ),
    );
    process.exit(1);
  }

  const provider = store.providers[store.active];

  if (provider.models.length === 0) {
    console.log(
      chalk.yellow(
        `Configuration "${store.active}" has no models. Run \`ccm edit\` to add models.`,
      ),
    );
    process.exit(1);
  }

  const currentModel = provider.env.ANTHROPIC_MODEL;
  if (currentModel) {
    console.log(chalk.dim(`Current model: ${currentModel}`));
  }

  const choices = buildSelectChoices(provider.models, currentModel);

  const controller = new AbortController();
  readline.emitKeypressEvents(process.stdin);
  const onKeypress = (_str: string, key: { name: string }) => {
    if (key?.name === "escape") {
      controller.abort();
    }
  };
  process.stdin.on("keypress", onKeypress);

  try {
    const chosen = await numberedSelect(
      {
        message: `Select a model (${store.active}):`,
        choices,
        pageSize: 15,
        default: currentModel,
      },
      { signal: controller.signal },
    );

    // Update store
    provider.env.ANTHROPIC_MODEL = chosen;
    await writeStore(store);

    // Update settings.json (clears stale keys first)
    await applyToSettings(provider.env);

    console.log(chalk.green(`Model switched to ${chalk.bold(chosen)}`));
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === "ExitPromptError" ||
        err.name === "CancelPromptError" ||
        err.name === "AbortPromptError")
    ) {
      console.log(chalk.dim("Model selection cancelled."));
      return;
    }
    throw err;
  } finally {
    process.stdin.removeListener("keypress", onKeypress);
  }
}
