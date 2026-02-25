#!/usr/bin/env node

import { createRequire } from "node:module";
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { listCommand } from "./commands/list.js";
import { useCommand } from "./commands/use.js";
import { editCommand } from "./commands/edit.js";
import { removeCommand } from "./commands/remove.js";
import { modelCommand } from "./commands/model.js";
import { usageCommand } from "./commands/usage.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("ccm")
  .description("CLI tool to configure claude-code for Bedrock/LiteLLM services")
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

program
  .command("use [name]")
  .description("Switch active configuration")
  .action(useCommand);

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

program
  .command("usage")
  .description("Query current API key balance and quota")
  .action(usageCommand);

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

program.parse();
