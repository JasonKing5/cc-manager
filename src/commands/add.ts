import { input, password, checkbox, select, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { readStore, writeStore, applyToSettings } from "../lib/store.js";
import { SETTINGS_PATH } from "../lib/settings.js";
import { buildCheckboxChoices } from "../lib/models.js";

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

  // 2. Base URL
  const baseUrl = await input({
    message: "Proxy Base URL:",
    default: "https://www.litellm.org/bedrock",
  });

  // 3. API Key
  const apiKey = await password({
    message: "API Key (sk-...):",
    mask: "*",
  });

  if (!apiKey || apiKey.trim().length === 0) {
    console.log(chalk.red("Error: API Key cannot be empty."));
    process.exit(1);
  }

  // 4. Region (optional)
  const region = await input({
    message: "AWS Region (leave empty to skip):",
    default: "us-west-2",
  });

  // 5. Models
  const modelMode = await select({
    message: "How do you want to configure models?",
    choices: [
      { name: "Select from built-in list", value: "builtin" },
      { name: "Enter model IDs (comma-separated)", value: "paste" },
    ],
  });

  let models: { name: string; value: string }[] = [];

  if (modelMode === "builtin") {
    const selectedValues = await checkbox({
      message: "Select models (space to toggle, enter to confirm):",
      choices: buildCheckboxChoices(),
      pageSize: 20,
    });

    models = selectedValues.map((v) => {
      const label = v.replace(/^(us\.|gemini\/|vertex_ai\/)/, "");
      return { name: label, value: v };
    });

    // Ask if user wants to add custom models
    const addCustom = await confirm({
      message: "Add custom models?",
      default: false,
    });

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

  // Build env
  const env: Record<string, string> = {
    CLAUDE_CODE_USE_BEDROCK: "1",
    CLAUDE_CODE_SKIP_BEDROCK_AUTH: "1",
    ANTHROPIC_AUTH_TOKEN: apiKey.trim(),
    ANTHROPIC_BEDROCK_BASE_URL: baseUrl.trim(),
  };

  if (region.trim()) {
    env.AWS_REGION = region.trim();
  }

  if (models.length > 0) {
    env.ANTHROPIC_MODEL = models[0].value;
  }

  // Save provider
  const trimmedName = name.trim();
  store.providers[trimmedName] = {
    name: trimmedName,
    env,
    models,
  };

  // 6. Activate?
  const shouldActivate = await confirm({
    message: "Activate this configuration now?",
    default: true,
  });

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
    more = await confirm({ message: "Add another?", default: false });
  }
  return models;
}
