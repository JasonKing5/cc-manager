import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { findTemplate } from "./providers.js";
import type { CcmStore } from "./store.js";

export function buildConfigChoices(
  store: CcmStore,
  opts?: { activeLabel?: string },
): { name: string; value: string; description?: string }[] {
  const label = opts?.activeLabel ?? "current";
  return Object.keys(store.providers).map((n) => {
    const p = store.providers[n];
    const isActive = n === store.active;

    const parts: string[] = [];
    const tmpl = p.provider ? findTemplate(p.provider) : undefined;
    if (tmpl) parts.push(tmpl.name);
    const url = p.env.ANTHROPIC_BASE_URL ?? p.env.ANTHROPIC_BEDROCK_BASE_URL;
    if (url) parts.push(url);
    if (p.env.AWS_REGION) parts.push(`region: ${p.env.AWS_REGION}`);
    parts.push(`${p.models.length} model(s)`);
    if (isActive && p.env.ANTHROPIC_MODEL) parts.push(`active: ${p.env.ANTHROPIC_MODEL}`);

    return {
      name: isActive ? `${n} ${chalk.cyan(`(${label})`)}` : n,
      value: n,
      description: chalk.dim(parts.join(" · ")),
    };
  });
}

/**
 * Confirm prompt using select with arrow-key navigation.
 * Focused item: bold, unfocused item: dim gray.
 */
export async function styledConfirm(
  message: string,
  defaultYes = true,
): Promise<boolean> {
  return select({
    message: `${message} ${chalk.dim("(↑↓ to switch, Enter to confirm)")}`,
    choices: [
      { name: "Yes", value: true },
      { name: "No", value: false },
    ],
    default: defaultYes,
    theme: {
      style: {
        highlight: (text: string) => chalk.bold(text),
      },
    },
  });
}
