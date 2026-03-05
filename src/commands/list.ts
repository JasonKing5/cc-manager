import chalk from "chalk";
import { readStore } from "../lib/store.js";
import { findTemplate } from "../lib/providers.js";

export async function listCommand(): Promise<void> {
  const store = await readStore();
  const names = Object.keys(store.providers);

  if (names.length === 0) {
    console.log(chalk.yellow("No configurations found. Run `ccm add` to create one."));
    return;
  }

  console.log("");
  console.log(chalk.bold("  Configurations"));
  console.log(chalk.dim("  ─────────────────────────────"));

  for (const name of names) {
    const p = store.providers[name];
    const isActive = name === store.active;
    const marker = isActive
      ? chalk.green("●")
      : chalk.dim("○");
    const suffix = isActive ? chalk.green(" (active)") : "";

    console.log(`  ${marker} ${chalk.bold(name)}${suffix}`);

    const template = p.provider ? findTemplate(p.provider) : undefined;
    if (template) {
      console.log(`    Provider: ${chalk.cyan(template.name)}`);
    }
    const url = p.env.ANTHROPIC_BASE_URL ?? p.env.ANTHROPIC_BEDROCK_BASE_URL;
    if (url) {
      console.log(`    URL:      ${chalk.cyan(url)}`);
    }
    if (p.env.AWS_REGION) {
      console.log(`    Region:   ${chalk.cyan(p.env.AWS_REGION)}`);
    }
    console.log(`    Models:   ${chalk.cyan(String(p.models.length))}`);
    if (isActive && p.env.ANTHROPIC_MODEL) {
      console.log(`    Active:   ${chalk.cyan(p.env.ANTHROPIC_MODEL)}`);
    }
    console.log("");
  }
}
