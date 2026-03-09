import { readFile } from "node:fs/promises";
import chalk from "chalk";
import { readStore, writeStore, type ProviderConfig } from "../lib/store.js";
import { numberedSelect } from "../lib/prompts.js";

export async function importCommand(file: string): Promise<void> {
  if (!file) {
    console.log(chalk.red("Usage: ccm import <file>"));
    process.exit(1);
  }

  let raw: string;
  try {
    raw = await readFile(file, "utf-8");
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log(chalk.red(`File not found: ${file}`));
    } else {
      console.log(chalk.red(`Failed to read file: ${err.message}`));
    }
    process.exit(1);
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    console.log(chalk.red("Invalid JSON file."));
    process.exit(1);
  }

  // Support both { providers: {...} } and direct { name: ProviderConfig } formats
  const providers: Record<string, ProviderConfig> =
    data.providers ?? data;

  if (typeof providers !== "object" || providers === null) {
    console.log(chalk.red("Invalid export file format."));
    process.exit(1);
  }

  const store = await readStore();
  let imported = 0;
  let skipped = 0;

  for (const [name, config] of Object.entries(providers)) {
    if (!config.env || !Array.isArray(config.models)) {
      console.log(chalk.yellow(`Skipping "${name}": invalid format.`));
      skipped++;
      continue;
    }

    if (store.providers[name]) {
      const action = await numberedSelect({
        message: `"${name}" already exists. What to do?`,
        choices: [
          { name: "Overwrite", value: "overwrite" },
          { name: `Import as "${name}-imported"`, value: "rename" },
          { name: "Skip", value: "skip" },
        ],
      });

      if (action === "skip") {
        skipped++;
        continue;
      }

      const targetName = action === "rename" ? `${name}-imported` : name;
      store.providers[targetName] = {
        name: targetName,
        ...(config.provider ? { provider: config.provider } : {}),
        env: { ...config.env },
        models: config.models.map((m: any) => ({ name: m.name, value: m.value })),
      };
      imported++;
    } else {
      store.providers[name] = {
        name,
        ...(config.provider ? { provider: config.provider } : {}),
        env: { ...config.env },
        models: config.models.map((m: any) => ({ name: m.name, value: m.value })),
      };
      imported++;
    }
  }

  await writeStore(store);
  console.log(
    chalk.green(
      `Imported ${imported} configuration(s)${skipped > 0 ? `, skipped ${skipped}` : ""}.`,
    ),
  );
}
