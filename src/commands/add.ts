import { input, password, checkbox, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import { readStore, writeStore, applyToSettings } from "../lib/store.js";
import { SETTINGS_PATH } from "../lib/settings.js";
import { MODEL_GROUPS, buildCheckboxChoices, humanizeModelId } from "../lib/models.js";
import { PROVIDER_TEMPLATES, type ProviderEnvField } from "../lib/providers.js";
import { fetchLiteLLMModels } from "../lib/fetch-models.js";
import { styledConfirm, numberedSelect } from "../lib/prompts.js";
import { promptCustomModels } from "./edit.js";

export async function addCommand(): Promise<void> {
  const store = await readStore();

  // 1. Provider selection (first, so we can derive a smart default name)
  const providerId = await numberedSelect({
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

  // 2. Env fields (before name, so manual mode URL can inform default name)
  if (providerId === "__manual__") {
    env = await promptManualEnv();
  } else {
    const template = PROVIDER_TEMPLATES.find((t) => t.id === providerId)!;
    templateId = template.id;
    env = await promptEnvFields(template.envFields);
    if (template.models.length > 0) {
      modelGroups = template.models;
    }
  }

  // 2b. Dynamic models: fetch from API if supported
  if (templateId) {
    const tpl = PROVIDER_TEMPLATES.find((t) => t.id === templateId);
    if (tpl?.dynamicModels) {
      try {
        console.log(chalk.dim("Fetching available models from API..."));
        const fetched = await fetchLiteLLMModels(env);
        if (fetched.length > 0) {
          modelGroups = fetched;
        } else {
          console.log(chalk.yellow("No models returned from API. Falling back to manual input."));
        }
      } catch (err) {
        console.log(chalk.yellow(`Could not fetch models: ${(err as Error).message}`));
        console.log(chalk.dim("You can add models manually."));
      }
    }
  }

  // 3. Name (with smart default based on provider/env)
  const defaultName = generateDefaultName(store.providers, templateId, env);
  const name = await input({
    message: "Configuration name:",
    default: defaultName,
    validate: (val) => {
      if (!val.trim()) return "Name cannot be empty.";
      if (store.providers[val.trim()]) return `"${val.trim()}" already exists.`;
      return true;
    },
  });

  // 4. Models: checkbox then inline custom input
  const selectedValues = await checkbox({
    message: "Select models (space to toggle, enter to confirm):",
    choices: buildCheckboxChoices(undefined, modelGroups),
    pageSize: 20,
  });

  models = selectedValues.map((v) => {
    const found = modelGroups.flatMap((g) => g.models).find((m) => m.value === v);
    return { name: found?.name ?? humanizeModelId(v), value: v };
  });

  // Custom model input — empty or Esc to finish
  models.push(...(await promptCustomModels()));

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
async function promptEnvFields(fields: ProviderEnvField[]): Promise<Record<string, string>> {
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

function generateDefaultName(
  providers: Record<string, unknown>,
  templateId: string | undefined,
  env: Record<string, string>,
): string {
  let base: string;
  if (templateId) {
    base = templateId;
  } else {
    // Manual mode: try to extract domain from ANTHROPIC_BASE_URL
    const url = env.ANTHROPIC_BASE_URL;
    if (url) {
      try {
        base = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
      } catch {
        base = "manual";
      }
    } else {
      base = "manual";
    }
  }

  if (!providers[base]) return base;
  // Append numeric suffix to avoid collision
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!providers[candidate]) return candidate;
  }
}

