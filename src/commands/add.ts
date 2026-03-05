import { input, password, checkbox, select, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import { readStore, writeStore, applyToSettings } from "../lib/store.js";
import { SETTINGS_PATH } from "../lib/settings.js";
import { MODEL_GROUPS, buildCheckboxChoices } from "../lib/models.js";
import { PROVIDER_TEMPLATES, type ProviderTemplate, type ProviderEnvField } from "../lib/providers.js";
import { styledConfirm } from "../lib/prompts.js";

export async function addCommand(): Promise<void> {
  const store = await readStore();

  // 1. Name
  const name = await input({
    message: "Configuration name:",
    validate: (val) => {
      if (!val.trim()) return "Name cannot be empty.";
      if (store.providers[val.trim()]) return `"${val.trim()}" already exists.`;
      return true;
    },
  });

  // 2. Provider selection
  const providerId = await select({
    message: "How do you want to set up this configuration?",
    choices: [
      new Separator(chalk.bold("── Provider Templates ──")),
      ...PROVIDER_TEMPLATES.map((t) => ({
        name: `${t.name.padEnd(22)} ${chalk.dim(t.description)}`,
        value: t.id,
      })),
      new Separator(chalk.bold("── Manual ──")),
      { name: "Fully manual          " + chalk.dim("Configure all environment variables yourself"), value: "__manual__" },
    ],
    pageSize: 20,
  });

  let env: Record<string, string> = {};
  let models: { name: string; value: string }[] = [];
  let templateId: string | undefined;
  let modelGroups = MODEL_GROUPS;

  if (providerId === "__manual__") {
    // Manual mode: prompt arbitrary key-value pairs
    env = await promptManualEnv();
    // All model groups
  } else {
    const template = PROVIDER_TEMPLATES.find((t) => t.id === providerId)!;
    templateId = template.id;
    env = await promptEnvFields(template.envFields);
    if (template.models.length > 0) {
      modelGroups = template.models;
    }
  }

  // 3. Models
  const modelMode = await select({
    message: "How do you want to configure models?",
    choices: [
      { name: "Select from built-in list", value: "builtin" },
      { name: "Enter model IDs (comma-separated)", value: "paste" },
    ],
  });

  if (modelMode === "builtin") {
    const selectedValues = await checkbox({
      message: "Select models (space to toggle, enter to confirm):",
      choices: buildCheckboxChoices(undefined, modelGroups),
      pageSize: 20,
    });

    models = selectedValues.map((v) => {
      const label = v.replace(/^(us\.|gemini\/|vertex_ai\/)/, "");
      return { name: label, value: v };
    });

    const addCustom = await styledConfirm("Add custom models?", false);
    if (addCustom) {
      models.push(...(await promptCustomModels()));
    }
  } else {
    const raw = await input({
      message: "Model IDs (comma-separated):",
    });
    for (const part of raw.split(/[,]+/)) {
      const trimmed = part.trim();
      if (trimmed) {
        models.push({ name: trimmed, value: trimmed });
      }
    }
  }

  if (models.length === 0) {
    console.log(chalk.yellow("Warning: No models selected. You can add models later with `ccm edit`."));
  }

  if (models.length > 0) {
    env.ANTHROPIC_MODEL = models[0].value;
  }

  // Save provider
  const trimmedName = name.trim();
  store.providers[trimmedName] = {
    name: trimmedName,
    ...(templateId ? { provider: templateId } : {}),
    env,
    models,
  };

  // Activate?
  const shouldActivate = await styledConfirm("Activate this configuration now?");

  if (shouldActivate) {
    store.active = trimmedName;
    await writeStore(store);
    await applyToSettings(store.providers[trimmedName].env);
    console.log(chalk.green(`Configuration "${trimmedName}" created and activated.`));
    console.log(chalk.dim(`Settings written to ${SETTINGS_PATH}`));
  } else {
    await writeStore(store);
    console.log(chalk.green(`Configuration "${trimmedName}" created.`));
  }
}

/** Prompt the user for env fields defined by a provider template */
export async function promptEnvFields(fields: ProviderEnvField[]): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  for (const field of fields) {
    if (field.fixed !== undefined) {
      env[field.key] = field.fixed;
      continue;
    }
    let value: string;
    if (field.secret) {
      value = await password({ message: `${field.label}:`, mask: "*" });
    } else {
      value = await input({
        message: `${field.label}:`,
        ...(field.default !== undefined ? { default: field.default } : {}),
      });
    }
    if (field.required && !value.trim()) {
      console.log(chalk.red(`Error: ${field.label} cannot be empty.`));
      process.exit(1);
    }
    if (value.trim()) {
      env[field.key] = value.trim();
    }
  }
  return env;
}

async function promptManualEnv(): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  console.log(chalk.dim("Add environment variables for this configuration."));
  let more = true;
  while (more) {
    const key = await input({ message: "Env var name:" });
    if (!key.trim()) break;
    const isSecret = key.trim().toLowerCase().includes("key") ||
                     key.trim().toLowerCase().includes("secret") ||
                     key.trim().toLowerCase().includes("token");
    let value: string;
    if (isSecret) {
      value = await password({ message: `Value for ${key.trim()}:`, mask: "*" });
    } else {
      value = await input({ message: `Value for ${key.trim()}:` });
    }
    if (value.trim()) {
      env[key.trim()] = value.trim();
    }
    more = await styledConfirm("Add another variable?", false);
  }
  return env;
}

async function promptCustomModels(): Promise<{ name: string; value: string }[]> {
  const models: { name: string; value: string }[] = [];
  let more = true;
  while (more) {
    const value = await input({ message: "Model ID:" });
    if (!value.trim()) break;
    const label = await input({
      message: "Display name:",
      default: value.trim(),
    });
    models.push({ name: label.trim(), value: value.trim() });
    more = await styledConfirm("Add another?", false);
  }
  return models;
}
