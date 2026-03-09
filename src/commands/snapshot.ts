import { input } from "@inquirer/prompts";
import chalk from "chalk";
import { readSettings } from "../lib/settings.js";
import { readStore, writeStore } from "../lib/store.js";
import { PROVIDER_TEMPLATES } from "../lib/providers.js";

export async function snapshotCommand(name?: string): Promise<void> {
  const settings = await readSettings();
  const env = settings.env;

  if (!env || Object.keys(env).length === 0) {
    console.log(
      chalk.yellow("No environment variables found in settings.json. Nothing to snapshot."),
    );
    return;
  }

  const store = await readStore();

  let configName = name;
  if (!configName) {
    configName = await input({
      message: "Configuration name for this snapshot:",
      default: "snapshot",
      validate: (val) => {
        if (!val.trim()) return "Name cannot be empty.";
        if (store.providers[val.trim()]) return `"${val.trim()}" already exists.`;
        return true;
      },
    });
  }

  const trimmed = configName.trim();
  if (store.providers[trimmed]) {
    console.log(chalk.red(`Configuration "${trimmed}" already exists.`));
    process.exit(1);
  }

  // Extract env vars and detect provider
  const capturedEnv: Record<string, string> = {};
  const allKnownKeys = new Set(
    PROVIDER_TEMPLATES.flatMap((t) => t.envFields.map((f) => f.key)).concat([
      "ANTHROPIC_MODEL",
    ]),
  );

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string" && allKnownKeys.has(key)) {
      capturedEnv[key] = value;
    }
  }

  // Try to detect provider template
  let detectedProvider: string | undefined;
  for (const t of PROVIDER_TEMPLATES) {
    const fixedFields = t.envFields.filter((f) => f.fixed);
    if (fixedFields.length === 0) continue;
    const allMatch = fixedFields.every((f) => capturedEnv[f.key] === f.fixed);
    if (allMatch) {
      detectedProvider = t.id;
      break;
    }
  }

  // Build model list from ANTHROPIC_MODEL if present
  const models: { name: string; value: string }[] = [];
  if (capturedEnv.ANTHROPIC_MODEL) {
    const value = capturedEnv.ANTHROPIC_MODEL;
    const label = value.replace(/^(us\.|gemini\/|vertex_ai\/)/, "");
    models.push({ name: label, value });
  }

  store.providers[trimmed] = {
    name: trimmed,
    ...(detectedProvider ? { provider: detectedProvider } : {}),
    env: capturedEnv,
    models,
  };

  await writeStore(store);

  console.log(chalk.green(`Snapshot saved as "${trimmed}".`));
  if (detectedProvider) {
    console.log(chalk.dim(`Detected provider: ${detectedProvider}`));
  }
  console.log(
    chalk.dim(`Captured ${Object.keys(capturedEnv).length} env var(s), ${models.length} model(s).`),
  );
}
