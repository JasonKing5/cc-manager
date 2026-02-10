#!/usr/bin/env node

import { createRequire } from "node:module";
import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
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
  .command("login")
  .description("Configure API Key and environment variables")
  .action(loginCommand);

program
  .command("model")
  .description("Interactively select a model")
  .action(modelCommand);

program
  .command("usage")
  .description("Query current API key balance and quota")
  .action(usageCommand);

program.parse();
