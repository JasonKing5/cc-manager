import { checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import type { Command } from "commander";
import { readSettings, writeSettings } from "../lib/settings.js";
import {
  readLocalSettings,
  writeLocalSettings,
  projectLocalPath,
} from "../lib/settings.js";
import { styledConfirm } from "../lib/prompts.js";
import { KNOWN_PLUGINS } from "../lib/permissions.js";

export function registerPluginCommand(program: Command): void {
  program
    .command("plugin")
    .description("Manage Claude Code plugins (toggle on/off)")
    .action(pluginCommand);
}

async function pluginCommand(): Promise<void> {
  const settings = await readSettings();
  const enabled: Record<string, boolean> = settings.enabledPlugins ?? {};

  // Build choices from known plugins
  const choices = KNOWN_PLUGINS.map((p) => {
    const isOn = enabled[p.id] === true;
    return {
      name: `${p.name.padEnd(20)} ${isOn ? chalk.green("[ON]") : chalk.dim("[OFF]")}`,
      value: p.id,
      checked: isOn,
    };
  });

  // Also include any unknown-but-enabled plugins from settings
  for (const id of Object.keys(enabled)) {
    if (!KNOWN_PLUGINS.some((p) => p.id === id)) {
      choices.push({
        name: `${id.padEnd(20)} ${enabled[id] ? chalk.green("[ON]") : chalk.dim("[OFF]")}`,
        value: id,
        checked: enabled[id] === true,
      });
    }
  }

  if (choices.length === 0) {
    console.log(chalk.yellow("No known plugins found."));
    return;
  }

  const selected = await checkbox({
    message: "Toggle plugins (space to select, enter to confirm)",
    choices,
  });

  const selectedSet = new Set(selected);

  // Compute diff
  const newlyEnabled: string[] = [];
  const newlyDisabled: string[] = [];

  for (const c of choices) {
    const wasOn = enabled[c.value] === true;
    const isOn = selectedSet.has(c.value);
    if (isOn && !wasOn) newlyEnabled.push(c.value);
    if (!isOn && wasOn) newlyDisabled.push(c.value);
  }

  // Update settings
  const updated: Record<string, boolean> = {};
  for (const c of choices) {
    updated[c.value] = selectedSet.has(c.value);
  }
  settings.enabledPlugins = updated;
  await writeSettings(settings);

  // Summary
  if (newlyEnabled.length === 0 && newlyDisabled.length === 0) {
    console.log(chalk.dim("\nNo changes."));
    return;
  }

  if (newlyEnabled.length > 0)
    console.log(chalk.green(`\nEnabled: ${newlyEnabled.map(pluginDisplayName).join(", ")}`));
  if (newlyDisabled.length > 0)
    console.log(chalk.red(`Disabled: ${newlyDisabled.map(pluginDisplayName).join(", ")}`));

  // Offer to add MCP permissions for newly enabled plugins
  for (const id of newlyEnabled) {
    const known = KNOWN_PLUGINS.find((p) => p.id === id);
    if (!known) continue;

    const addMcp = await styledConfirm(
      `Add MCP permissions for ${known.name} to current project?`,
    );
    if (addMcp) {
      const localPath = projectLocalPath();
      const local = await readLocalSettings(localPath);
      const perms: string[] = local.permissions?.allow ?? [];
      const wildcards = known.mcpPrefixes.map((p) => `${p}*`);
      const added: string[] = [];
      for (const wildcard of wildcards) {
        if (!perms.includes(wildcard)) {
          perms.push(wildcard);
          added.push(wildcard);
        }
      }
      if (added.length > 0) {
        local.permissions = { ...local.permissions, allow: perms };
        await writeLocalSettings(localPath, local);
        console.log(chalk.green(`  Added ${added.join(", ")} to project permissions.`));
      } else {
        console.log(chalk.dim(`  MCP permissions for ${known.name} already in project permissions.`));
      }
    }
  }
}

function pluginDisplayName(id: string): string {
  const known = KNOWN_PLUGINS.find((p) => p.id === id);
  return known ? known.name : id;
}
