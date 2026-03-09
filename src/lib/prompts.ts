import { select, Separator } from "@inquirer/prompts";
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
 * Numbered select — wraps @inquirer/prompts select with:
 * - Auto-numbered choices (Separators are not numbered)
 * - `›` prefix on focused item via theme
 * - Bottom help hint via theme
 */
export async function numberedSelect<T>(
  config: Parameters<typeof select<T>>[0],
  opts?: Parameters<typeof select<T>>[1],
): Promise<T> {
  let idx = 0;
  const numberedChoices = (config.choices as any[]).map((c: any) => {
    if (c instanceof Separator || c.type === "separator") return c;
    idx++;
    return {
      ...c,
      name: `${idx}. ${c.name ?? c.value}`,
    };
  });

  return select(
    {
      ...config,
      choices: numberedChoices,
      theme: {
        ...((config as any).theme ?? {}),
        style: {
          ...((config as any).theme?.style ?? {}),
          highlight: (text: string) => chalk.bold(text),
        },
        prefix: {
          idle: "›",
          done: chalk.green("✔"),
        },
        helpMode: "always" as const,
      },
    },
    opts,
  );
}

/**
 * Confirm prompt using numbered select.
 * Shows: › 1. Yes / 2. No, cancel (Esc)
 */
export async function styledConfirm(
  message: string,
  defaultYes = true,
): Promise<boolean> {
  return numberedSelect({
    message,
    choices: [
      { name: "Yes", value: true },
      { name: "No, cancel (Esc)", value: false },
    ],
    default: defaultYes,
  });
}
