import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { readStore, type ProviderConfig } from "../lib/store.js";
import { buildConfigChoices, numberedSelect } from "../lib/prompts.js";
import type { Command } from "commander";

export function registerExportCommand(program: Command): void {
  program
    .command("export [name]")
    .description("Export configuration(s) to a JSON file")
    .option("-o, --output <file>", "Output file path", "ccm-export.json")
    .option("--mask-secrets", "Mask secret values in export")
    .action(exportCommand);
}

/** Keys that contain secrets */
const SECRET_KEYS = [
  "ANTHROPIC_AUTH_TOKEN",
  "AWS_SECRET_ACCESS_KEY",
];

export async function exportCommand(
  name?: string,
  opts?: { output?: string; maskSecrets?: boolean },
): Promise<void> {
  const store = await readStore();
  const names = Object.keys(store.providers);

  if (names.length === 0) {
    console.log(chalk.yellow("No configurations found."));
    return;
  }

  let exportData: Record<string, ProviderConfig>;

  if (name) {
    if (!store.providers[name]) {
      console.log(chalk.red(`Configuration "${name}" not found.`));
      process.exit(1);
    }
    exportData = { [name]: store.providers[name] };
  } else if (names.length === 1) {
    exportData = store.providers;
  } else {
    const choice = await numberedSelect({
      message: "What to export?",
      choices: [
        { name: "All configurations", value: "__all__" },
        ...buildConfigChoices(store, { activeLabel: "active" }),
      ],
    });
    if (choice === "__all__") {
      exportData = store.providers;
    } else {
      exportData = { [choice]: store.providers[choice] };
    }
  }

  // Deep clone for masking
  const output = JSON.parse(JSON.stringify(exportData)) as Record<
    string,
    ProviderConfig
  >;

  if (opts?.maskSecrets) {
    for (const config of Object.values(output)) {
      for (const key of SECRET_KEYS) {
        if (config.env[key]) {
          config.env[key] = "***MASKED***";
        }
      }
    }
  }

  const filePath = opts?.output ?? "ccm-export.json";
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    active: store.active,
    providers: output,
  };

  await writeFile(filePath, JSON.stringify(payload, null, 2) + "\n");
  const count = Object.keys(output).length;
  console.log(
    chalk.green(`Exported ${count} configuration(s) to ${filePath}`),
  );
}
