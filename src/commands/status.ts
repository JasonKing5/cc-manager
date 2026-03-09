import chalk from "chalk";
import { readStore } from "../lib/store.js";
import { findTemplate } from "../lib/providers.js";
import type { Command } from "commander";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show current active configuration")
    .option("--json", "Output as JSON")
    .option("--short", "One-line output for shell prompts")
    .action(statusCommand);
}

export async function statusCommand(opts?: {
  json?: boolean;
  short?: boolean;
}): Promise<void> {
  const store = await readStore();

  if (!store.active || !store.providers[store.active]) {
    if (opts?.json) {
      console.log(JSON.stringify({ active: null }));
      return;
    }
    if (opts?.short) {
      console.log("ccm: none");
      return;
    }
    console.log(chalk.yellow("No active configuration. Run `ccm use` to activate one."));
    return;
  }

  const name = store.active;
  const provider = store.providers[name];
  const template = provider.provider ? findTemplate(provider.provider) : undefined;
  const model = provider.env.ANTHROPIC_MODEL;
  const url =
    provider.env.ANTHROPIC_BASE_URL ?? provider.env.ANTHROPIC_BEDROCK_BASE_URL;
  const region = provider.env.AWS_REGION ?? provider.env.CLOUD_ML_REGION;

  if (opts?.json) {
    console.log(
      JSON.stringify({
        active: name,
        provider: template?.name ?? provider.provider ?? null,
        model: model ?? null,
        url: url ?? null,
        region: region ?? null,
        models: provider.models.length,
        previous: store.previousActive ?? null,
      }),
    );
    return;
  }

  if (opts?.short) {
    const parts = [name];
    if (template) parts.push(template.name);
    if (model) parts.push(model);
    console.log(parts.join(" | "));
    return;
  }

  console.log("");
  console.log(chalk.bold("  Current Configuration"));
  console.log(chalk.dim("  ─────────────────────────────"));
  console.log(`  Name:      ${chalk.cyan(name)}`);
  if (template) {
    console.log(`  Provider:  ${chalk.cyan(template.name)}`);
  }
  if (url) {
    console.log(`  URL:       ${chalk.cyan(url)}`);
  }
  if (region) {
    console.log(`  Region:    ${chalk.cyan(region)}`);
  }
  if (model) {
    console.log(`  Model:     ${chalk.cyan(model)}`);
  }
  console.log(`  Models:    ${chalk.cyan(String(provider.models.length))}`);
  if (store.previousActive) {
    console.log(`  Previous:  ${chalk.dim(store.previousActive)}`);
  }
  console.log("");
}
