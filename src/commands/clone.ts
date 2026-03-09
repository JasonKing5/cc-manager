import { input } from "@inquirer/prompts";
import chalk from "chalk";
import { readStore, writeStore } from "../lib/store.js";
import { buildConfigChoices, numberedSelect } from "../lib/prompts.js";

export async function cloneCommand(
  source?: string,
  newName?: string,
): Promise<void> {
  const store = await readStore();
  const names = Object.keys(store.providers);

  if (names.length === 0) {
    console.log(chalk.yellow("No configurations found. Run `ccm add` to create one."));
    return;
  }

  let src = source;
  if (!src) {
    src = await numberedSelect({
      message: "Select a configuration to clone:",
      choices: buildConfigChoices(store, { activeLabel: "active" }),
      default: store.active ?? undefined,
    });
  }

  if (!store.providers[src]) {
    console.log(chalk.red(`Configuration "${src}" not found.`));
    process.exit(1);
  }

  let target = newName;
  if (!target) {
    target = await input({
      message: "New configuration name:",
      default: `${src}-copy`,
      validate: (val) => {
        if (!val.trim()) return "Name cannot be empty.";
        if (store.providers[val.trim()]) return `"${val.trim()}" already exists.`;
        return true;
      },
    });
  }

  const trimmed = target.trim();
  if (store.providers[trimmed]) {
    console.log(chalk.red(`Configuration "${trimmed}" already exists.`));
    process.exit(1);
  }

  // Deep clone
  const original = store.providers[src];
  store.providers[trimmed] = {
    name: trimmed,
    ...(original.provider ? { provider: original.provider } : {}),
    env: { ...original.env },
    models: original.models.map((m) => ({ ...m })),
  };

  await writeStore(store);
  console.log(chalk.green(`Configuration "${src}" cloned as "${trimmed}".`));
}
