import { input, password, checkbox, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import { readStore, writeStore, applyToSettings } from "../lib/store.js";
import { SETTINGS_PATH } from "../lib/settings.js";
import { MODEL_GROUPS, buildCheckboxChoices, type ModelGroup } from "../lib/models.js";
import { findTemplate } from "../lib/providers.js";
import { buildConfigChoices, numberedSelect, styledConfirm } from "../lib/prompts.js";

export async function editCommand(name?: string): Promise<void> {
  const store = await readStore();
  const names = Object.keys(store.providers);

  if (names.length === 0) {
    console.log(chalk.yellow("No configurations found. Run `ccm add` to create one."));
    return;
  }

  let target = name;

  if (!target) {
    target = await numberedSelect({
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

  // ── Menu loop ──
  while (true) {
    type Action = "name" | "env" | "url" | "apikey" | "region" | "models" | "fast-model" | "done";
    const menuChoices: ({ name: string; value: Action } | Separator)[] = [
      { name: "Name", value: "name" as Action },
    ];

    if (template) {
      menuChoices.push({ name: "Environment fields", value: "env" as Action });
    } else {
      menuChoices.push(
        { name: "Base URL", value: "url" as Action },
        { name: "API Key", value: "apikey" as Action },
        { name: "Region", value: "region" as Action },
      );
    }

    menuChoices.push(
      { name: `Models ${chalk.dim(`(${provider.models.length} selected)`)}`, value: "models" as Action },
      { name: "Set fast model", value: "fast-model" as Action },
      new Separator("──────────"),
      { name: "Done (save & exit)", value: "done" as Action },
    );

    let action: Action;
    try {
      action = await numberedSelect<Action>({
        message: `Editing "${target}":`,
        choices: menuChoices,
      });
    } catch {
      break; // ExitPromptError (Esc/Ctrl+C)
    }

    if (action === "done") break;

    // ── Execute chosen action ──
    try {
      switch (action) {
        case "name": {
          const oldName = provider.name;
          const newName = await input({
            message: "Name:",
            default: oldName,
            validate: (val) => {
              if (!val.trim()) return "Name cannot be empty.";
              if (val.trim() !== oldName && store.providers[val.trim()])
                return `"${val.trim()}" already exists.`;
              return true;
            },
          });
          const trimmedName = newName.trim();
          if (trimmedName !== oldName) {
            provider.name = trimmedName;
            delete store.providers[oldName];
            store.providers[trimmedName] = provider;
            if (store.active === oldName) store.active = trimmedName;
            target = trimmedName;
            console.log(chalk.dim(`Renamed to "${trimmedName}".`));
          }
          break;
        }

        case "env": {
          const editableFields = template!.envFields.filter((f) => !f.fixed);
          for (const field of editableFields) {
            const current = provider.env[field.key] ?? "";
            if (field.secret) {
              console.log(chalk.dim(`  Current ${field.label}: ${maskKey(current)}`));
              const val = await password({ message: `${field.label} (enter to keep):`, mask: "*" });
              if (val && val.trim()) {
                provider.env[field.key] = val.trim();
              }
            } else {
              const val = await input({
                message: `${field.label}:`,
                default: current || field.default || "",
              });
              if (val.trim()) {
                provider.env[field.key] = val.trim();
              }
            }
          }
          break;
        }

        case "url": {
          const urlVal = await input({
            message: "Base URL:",
            default: provider.env.ANTHROPIC_BEDROCK_BASE_URL ?? provider.env.ANTHROPIC_BASE_URL ?? "",
          });
          if (urlVal.trim()) {
            if (provider.env.ANTHROPIC_BEDROCK_BASE_URL !== undefined) {
              provider.env.ANTHROPIC_BEDROCK_BASE_URL = urlVal.trim();
            } else {
              provider.env.ANTHROPIC_BASE_URL = urlVal.trim();
            }
          }
          break;
        }

        case "apikey": {
          const currentKey = provider.env.ANTHROPIC_AUTH_TOKEN ?? "";
          if (currentKey) {
            console.log(chalk.dim(`  Current API Key: ${maskKey(currentKey)}`));
          }
          const keyVal = await password({ message: "API Key (enter to keep):", mask: "*" });
          if (keyVal && keyVal.trim()) {
            provider.env.ANTHROPIC_AUTH_TOKEN = keyVal.trim();
          }
          break;
        }

        case "region": {
          const regionVal = await input({
            message: "Region:",
            default: provider.env.AWS_REGION ?? "",
          });
          if (regionVal.trim()) {
            provider.env.AWS_REGION = regionVal.trim();
          } else if (!regionVal.trim() && provider.env.AWS_REGION) {
            delete provider.env.AWS_REGION;
          }
          break;
        }

        case "models": {
          const modelGroups = template?.models.length ? template.models : MODEL_GROUPS;
          const currentModelValues = new Set(provider.models.map((m) => m.value));

          const builtinValues = new Set(modelGroups.flatMap((g) => g.models.map((m) => m.value)));
          const customModels = provider.models.filter((m) => !builtinValues.has(m.value));

          const choiceGroups: ModelGroup[] = [...modelGroups];
          if (customModels.length > 0) {
            choiceGroups.push({
              label: "Custom (current)",
              models: customModels.map((m) => ({ name: m.name, value: m.value })),
            });
          }

          const selected = await checkbox({
            message: "Models (space to toggle):",
            choices: buildCheckboxChoices(currentModelValues, choiceGroups),
            pageSize: 20,
          });

          provider.models = selected.map((v) => {
            const existing = provider.models.find((m) => m.value === v);
            if (existing) return { name: existing.name, value: existing.value };
            const label = v.replace(/^(us\.|gemini\/|vertex_ai\/)/, "");
            return { name: label, value: v };
          });

          // Custom model input
          const customAdded = await promptCustomModels();
          provider.models.push(...customAdded);

          // Sync ANTHROPIC_MODEL
          if (provider.models.length > 0) {
            if (!provider.models.some((m) => m.value === provider.env.ANTHROPIC_MODEL)) {
              provider.env.ANTHROPIC_MODEL = provider.models[0].value;
            }
          } else {
            delete provider.env.ANTHROPIC_MODEL;
          }

          console.log(chalk.dim(`${provider.models.length} model(s) configured.`));
          break;
        }

        case "fast-model": {
          if (provider.models.length === 0) {
            console.log(chalk.yellow("No models available. Add models first."));
            break;
          }
          const currentFast = provider.env.ANTHROPIC_SMALL_FAST_MODEL;
          const fastChoices: { name: string; value: string }[] = provider.models.map(
            (m) => ({
              name: `${m.name.padEnd(30)} ${chalk.dim(m.value)}${m.value === currentFast ? chalk.cyan(" (current)") : ""}`,
              value: m.value,
            }),
          );
          fastChoices.push({ name: "Enter manually", value: "__manual__" });
          fastChoices.push({ name: currentFast ? chalk.red("Clear fast model") : chalk.dim("Skip (no fast model)"), value: "__clear__" });

          const fastChoice = await numberedSelect({
            message: "Fast model:",
            choices: fastChoices,
            default: currentFast ?? "__clear__",
          });

          if (fastChoice === "__clear__") {
            delete provider.env.ANTHROPIC_SMALL_FAST_MODEL;
          } else if (fastChoice === "__manual__") {
            const val = await input({
              message: "Fast model ID:",
              default: currentFast ?? "",
            });
            if (val.trim()) {
              provider.env.ANTHROPIC_SMALL_FAST_MODEL = val.trim();
            }
          } else {
            provider.env.ANTHROPIC_SMALL_FAST_MODEL = fastChoice;
          }
          break;
        }
      }
    } catch {
      break; // ExitPromptError during sub-prompt
    }

    // ── Persist after each action ──
    await writeStore(store);
    if (store.active === target) {
      await applyToSettings(provider.env);
    }
  }

  // Final save (in case loop exited via Done without action)
  await writeStore(store);
  if (store.active === target) {
    await applyToSettings(provider.env);
    console.log(chalk.dim(`Settings synced to ${SETTINGS_PATH}`));
  }
  console.log(chalk.green(`Configuration "${target}" saved.`));
}

/** Continuous custom model input with auto-derived display name */
export async function promptCustomModels(): Promise<{ name: string; value: string }[]> {
  const models: { name: string; value: string }[] = [];
  while (true) {
    let raw: string;
    try {
      raw = await input({ message: "Custom model (empty to skip):" });
    } catch {
      break;
    }
    if (!raw.trim()) break;

    const id = raw.trim();
    const defaultName = id.replace(/^(us\.|gemini\/|vertex_ai\/)/, "");

    let displayName: string;
    try {
      displayName = await input({ message: "  Display name:", default: defaultName });
    } catch {
      break;
    }
    displayName = displayName.trim() || defaultName;

    models.push({ name: displayName, value: id });
  }
  return models;
}

function maskKey(key: string): string {
  if (!key) return chalk.dim("(not set)");
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}
