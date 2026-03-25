#!/usr/bin/env node

import { createRequire } from "node:module";
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { listCommand } from "./commands/list.js";
import { registerUseCommand } from "./commands/use.js";
import { editCommand } from "./commands/edit.js";
import { removeCommand } from "./commands/remove.js";
import { modelCommand } from "./commands/model.js";
import { registerUsageCommand } from "./commands/usage.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { cloneCommand } from "./commands/clone.js";
import { registerExportCommand } from "./commands/export.js";
import { importCommand } from "./commands/import.js";
import { snapshotCommand } from "./commands/snapshot.js";
import { registerCompletionCommand } from "./commands/completion.js";
import { registerPermCommand } from "./commands/perm.js";
import { registerPluginCommand } from "./commands/plugin.js";
import { registerModeCommand } from "./commands/mode.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("ccm")
  .description("CLI tool to manage multiple provider configurations for claude-code")
  .version(pkg.version);

program
  .command("add")
  .description("Add a new provider configuration")
  .action(addCommand);

program
  .command("list")
  .alias("ls")
  .description("List all configurations")
  .action(listCommand);

registerUseCommand(program);

program
  .command("edit [name]")
  .description("Edit a configuration")
  .action(editCommand);

program
  .command("remove [name]")
  .alias("rm")
  .description("Remove a configuration")
  .action(removeCommand);

program
  .command("model")
  .description("Select a model from active configuration")
  .action(modelCommand);

registerUsageCommand(program);

registerStatusCommand(program);
registerDoctorCommand(program);

program
  .command("clone [source] [newName]")
  .alias("cp")
  .description("Clone a configuration")
  .action(cloneCommand);

registerExportCommand(program);

program
  .command("import <file>")
  .description("Import configurations from a JSON file")
  .action(importCommand);

program
  .command("snapshot [name]")
  .description("Save current settings.json as a new configuration")
  .action(snapshotCommand);

registerCompletionCommand(program);
registerPermCommand(program);
registerPluginCommand(program);
registerModeCommand(program);

// Gracefully handle Ctrl+C during interactive prompts
process.on("uncaughtException", (err) => {
  if (
    err.name === "ExitPromptError" ||
    err.name === "CancelPromptError" ||
    err.name === "AbortPromptError"
  ) {
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});

// Prefix matching: auto-resolve unambiguous command prefixes
const userArgs = process.argv.slice(2);
const firstArg = userArgs[0];
if (firstArg && !firstArg.startsWith("-")) {
  const allNames: string[] = [];
  for (const cmd of program.commands) {
    allNames.push(cmd.name(), ...cmd.aliases());
  }
  const exact = allNames.includes(firstArg);
  if (!exact) {
    const matches = allNames.filter((n) => n.startsWith(firstArg));
    if (matches.length === 1) {
      process.argv = [process.argv[0], process.argv[1], matches[0], ...userArgs.slice(1)];
    }
  }
}

program.parse();
