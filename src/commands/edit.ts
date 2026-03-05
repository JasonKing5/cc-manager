import { input, password, select, checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import { readStore, writeStore, applyToSettings } from "../lib/store.js";
import { SETTINGS_PATH } from "../lib/settings.js";
import { MODEL_GROUPS, buildCheckboxChoices } from "../lib/models.js";
import { findTemplate } from "../lib/providers.js";
import { promptEnvFields } from "../commands/add.js";
import { styledConfirm, buildConfigChoices } from "../lib/prompts.js";

export async function editCommand(name?: string): Promise<void> {
  const store = await readStore();
  const names = Object.keys(store.providers);

  if (names.length === 0) {
    console.log(chalk.yellow("No configurations found. Run `ccm add` to create one."));
    return;
  }

  let target = name;

  if (!target) {
    target = await select({
      message: "Select a configuration to edit:",
      choices: buildConfigChoices(store, { activeLabel: "active" }),
      default: store.active ?? undefined,
    });
  }

  if (!store.providers[target]) {
    console.log(chalk.red(`Configuration "${target}" not found.`));
    process.exit(1);
  }

  const provider = store.providers[target];
  const template = provider.provider ? findTemplate(provider.provider) : undefined;
  let done = false;

  while (!done) {
    const choices = buildEditChoices(provider, template !== undefined);
    const action = await select({
      message: `Editing "${target}" — what do you want to change?`,
      choices,
    });

    switch (action) {
      case "name": {
        const oldName = provider.name;
        const newName = await input({
          message: "New name:",
          default: oldName,
          validate: (val) => {
            if (!val.trim()) return "Name cannot be empty.";
            if (val.trim() !== oldName && store.providers[val.trim()])
              return `"${val.trim()}" already exists.`;
            return true;
          },
        });
        const trimmed = newName.trim();
        if (trimmed !== oldName) {
          provider.name = trimmed;
          delete store.providers[oldName];
          store.providers[trimmed] = provider;
          if (store.active === oldName) store.active = trimmed;
          target = trimmed;
          console.log(chalk.green(`Renamed to "${trimmed}".`));
        }
        break;
      }
      case "env-fields": {
        if (!template) break;
        const editableFields = template.envFields.filter((f) => !f.fixed);
        if (editableFields.length === 0) {
          console.log(chalk.yellow("No editable environment fields for this provider."));
          break;
        }
        const fieldKey = await select({
          message: "Which field to edit?",
          choices: editableFields.map((f) => ({
            name: `${f.label.padEnd(30)} ${chalk.dim(maskIfSecret(provider.env[f.key] ?? "", f.secret))}`,
            value: f.key,
          })),
        });
        const field = editableFields.find((f) => f.key === fieldKey)!;
        let value: string;
        if (field.secret) {
          console.log(chalk.dim(`Current: ${maskKey(provider.env[field.key] ?? "")}`));
          value = await password({ message: `New ${field.label}:`, mask: "*" });
        } else {
          value = await input({
            message: `${field.label}:`,
            default: provider.env[field.key] ?? field.default ?? "",
          });
        }
        if (value.trim()) {
          provider.env[field.key] = value.trim();
          console.log(chalk.green(`${field.label} updated.`));
        }
        break;
      }
      // Legacy edit actions for configs without a template
      case "url": {
        const val = await input({
          message: "Base URL:",
          default: provider.env.ANTHROPIC_BEDROCK_BASE_URL ?? "",
        });
        provider.env.ANTHROPIC_BEDROCK_BASE_URL = val.trim();
        console.log(chalk.green("URL updated."));
        break;
      }
      case "key": {
        console.log(chalk.dim(`Current key: ${maskKey(provider.env.ANTHROPIC_AUTH_TOKEN ?? "")}`));
        const val = await password({ message: "New API Key:", mask: "*" });
        if (val && val.trim()) {
          provider.env.ANTHROPIC_AUTH_TOKEN = val.trim();
          console.log(chalk.green("API Key updated."));
        }
        break;
      }
      case "region": {
        const val = await input({
          message: "Region:",
          default: provider.env.AWS_REGION ?? "",
        });
        if (val.trim()) {
          provider.env.AWS_REGION = val.trim();
        } else {
          delete provider.env.AWS_REGION;
        }
        console.log(chalk.green("Region updated."));
        break;
      }
      case "add-models": {
        const modelGroups = template?.models.length ? template.models : MODEL_GROUPS;
        const existing = new Set(provider.models.map((m) => m.value));
        const selected = await checkbox({
          message: "Select models to add (space to toggle):",
          choices: buildCheckboxChoices(existing, modelGroups),
          pageSize: 20,
        });

        let added = 0;
        for (const v of selected) {
          if (!existing.has(v)) {
            const label = v.replace(/^(us\.|gemini\/|vertex_ai\/)/, "");
            provider.models.push({ name: label, value: v });
            added++;
          }
        }

        // Custom models
        const addCustom = await styledConfirm("Add custom models?", false);
        if (addCustom) {
          let more = true;
          while (more) {
            const value = await input({ message: "Model ID:" });
            if (!value.trim()) break;
            const label = await input({ message: "Display name:", default: value.trim() });
            provider.models.push({ name: label.trim(), value: value.trim() });
            added++;
            more = await styledConfirm("Add another?", false);
          }
        }

        console.log(chalk.green(`${added} model(s) added.`));
        break;
      }
      case "remove-models": {
        if (provider.models.length === 0) {
          console.log(chalk.yellow("No models to remove."));
          break;
        }
        const toRemove = await checkbox({
          message: "Select models to remove:",
          choices: provider.models.map((m) => ({
            name: `${m.name.padEnd(30)} ${m.value}`,
            value: m.value,
          })),
        });
        const removeSet = new Set(toRemove);
        provider.models = provider.models.filter((m) => !removeSet.has(m.value));

        // Fix orphaned ANTHROPIC_MODEL
        if (
          provider.env.ANTHROPIC_MODEL &&
          !provider.models.some((m) => m.value === provider.env.ANTHROPIC_MODEL)
        ) {
          if (provider.models.length > 0) {
            provider.env.ANTHROPIC_MODEL = provider.models[0].value;
            console.log(chalk.yellow(`Active model was removed. Defaulted to "${provider.models[0].value}".`));
          } else {
            delete provider.env.ANTHROPIC_MODEL;
            console.log(chalk.yellow("All models removed. Active model cleared."));
          }
        }

        console.log(chalk.green(`${toRemove.length} model(s) removed.`));
        break;
      }
      case "done":
        done = true;
        break;
    }
  }

  // Persist
  await writeStore(store);

  // If editing active provider, sync to settings.json
  if (store.active === target) {
    await applyToSettings(provider.env);
    console.log(chalk.dim(`Settings synced to ${SETTINGS_PATH}`));
  }

  console.log(chalk.green(`Configuration "${target}" saved.`));
}

function buildEditChoices(
  provider: { provider?: string; env: Record<string, string> },
  hasTemplate: boolean,
): { name: string; value: string }[] {
  const choices: { name: string; value: string }[] = [
    { name: "Name", value: "name" },
  ];

  if (hasTemplate) {
    choices.push({ name: "Environment fields", value: "env-fields" });
  } else {
    // Legacy menu for configs without a provider template
    choices.push(
      { name: "Base URL", value: "url" },
      { name: "API Key", value: "key" },
      { name: "Region", value: "region" },
    );
  }

  choices.push(
    { name: "Add models", value: "add-models" },
    { name: "Remove models", value: "remove-models" },
    { name: chalk.green("Done"), value: "done" },
  );

  return choices;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function maskIfSecret(value: string, secret?: boolean): string {
  if (!value) return chalk.dim("(not set)");
  return secret ? maskKey(value) : value;
}
