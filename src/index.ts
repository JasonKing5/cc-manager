#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { modelCommand } from "./commands/model.js";
import { usageCommand } from "./commands/usage.js";

const program = new Command();

program
  .name("ccm")
  .description("CLI tool to configure claude-code for Bedrock/LiteLLM services")
  .version("1.0.0");

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
