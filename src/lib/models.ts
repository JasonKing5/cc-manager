import { Separator } from "@inquirer/prompts";
import chalk from "chalk";

export interface ModelChoice {
  name: string;
  value: string;
}

export interface ModelGroup {
  label: string;
  models: ModelChoice[];
}

export const MODEL_GROUPS: ModelGroup[] = [
  {
    label: "Anthropic (Claude)",
    models: [
      { name: "Claude Opus 4.6", value: "us.anthropic.claude-opus-4-6-v1" },
      { name: "Claude Sonnet 4.6", value: "us.anthropic.claude-sonnet-4-6-v1" },
      { name: "Claude Opus 4.5", value: "us.anthropic.claude-opus-4-5-20251101-v1:0" },
      { name: "Claude Sonnet 4.5", value: "us.anthropic.claude-sonnet-4-5-20250929-v1:0" },
      { name: "Claude Haiku 4.5", value: "us.anthropic.claude-haiku-4-5-20251001-v1:0" },
      { name: "Claude Opus 4.1", value: "us.anthropic.claude-opus-4-1-20250805-v1:0" },
      { name: "Claude Opus 4", value: "us.anthropic.claude-opus-4-20250514-v1:0" },
      { name: "Claude Sonnet 4", value: "us.anthropic.claude-sonnet-4-20250514-v1:0" },
      { name: "Claude 3.7 Sonnet", value: "us.anthropic.claude-3-7-sonnet-20250219-v1:0" },
      { name: "Claude 3.5 Sonnet (v2)", value: "us.anthropic.claude-3-5-sonnet-20241022-v2:0" },
      { name: "Claude 3.5 Haiku", value: "us.anthropic.claude-3-5-haiku-20241022-v1:0" },
    ],
  },
  {
    label: "OpenAI (GPT)",
    models: [
      { name: "GPT-5.2", value: "gpt-5.2" },
      { name: "GPT-5.2 Codex", value: "gpt-5.2-codex" },
      { name: "GPT-5.1", value: "gpt-5.1" },
      { name: "GPT-5.1 Codex", value: "gpt-5.1-codex" },
      { name: "GPT-5", value: "gpt-5" },
      { name: "GPT-5 Mini", value: "gpt-5-mini" },
      { name: "GPT-4o", value: "gpt-4o" },
      { name: "o4 Mini", value: "o4-mini" },
    ],
  },
  {
    label: "Google (Gemini)",
    models: [
      { name: "Gemini 3 Pro (Preview)", value: "gemini/gemini-3-pro-preview" },
      { name: "Gemini 2.5 Pro", value: "gemini/gemini-2.5-pro" },
      { name: "Gemini 2.5 Flash", value: "gemini/gemini-2.5-flash" },
    ],
  },
  {
    label: "Amazon & Others",
    models: [
      { name: "Amazon Nova Pro", value: "us.amazon.nova-pro-v1:0" },
      { name: "Amazon Nova Lite", value: "us.amazon.nova-lite-v1:0" },
      { name: "Llama 4 Maverick", value: "us.meta.llama4-maverick-17b-instruct-v1:0" },
    ],
  },
];

/** Detect vendor from model ID */
export function detectVendor(id: string): string {
  const lower = id.toLowerCase();

  // Anthropic/Claude
  if (lower.includes("anthropic") || lower.includes("claude")) return "Anthropic";

  // OpenAI/GPT
  if (lower.includes("openai") || lower.match(/^(gpt-|o\d+-)/)) return "OpenAI";

  // Google/Gemini
  if (lower.includes("google") || lower.includes("gemini")) return "Google";

  // Amazon
  if (lower.includes("amazon") || lower.includes("nova")) return "Amazon";

  // Meta/Llama
  if (lower.includes("meta") || lower.includes("llama")) return "Meta";

  // DeepSeek
  if (lower.includes("deepseek")) return "DeepSeek";

  // Mistral
  if (lower.includes("mistral")) return "Mistral";

  // Qwen
  if (lower.includes("qwen")) return "Qwen";

  // Zhipu
  if (lower.includes("zhipu") || lower.includes("glm")) return "Zhipu";

  // Cohere
  if (lower.includes("cohere") || lower.includes("command")) return "Cohere";

  return "Other";
}

/** Generate a friendly display name from a raw model ID */
export function humanizeModelId(id: string): string {
  // 1. Strip common prefixes: "us.", vendor dots, org/ paths
  let name = id
    .replace(/^(us\.)?(anthropic|amazon|meta|google|mistralai|deepseek)\./i, "")
    .replace(/^[A-Za-z0-9_-]+\//, "");

  // 2. Strip version suffixes: -v1:0, @20241022, -20250514 etc.
  name = name
    .replace(/-v\d+:\d+$/, "")
    .replace(/@[\w.-]+$/, "")
    .replace(/-\d{8}(-v\d+)?$/, "");

  // 3. kebab-case → Title Case
  name = name
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return name;
}

/** Group model IDs by vendor and sort within each group */
export function groupAndSortModels(ids: string[]): ModelGroup[] {
  // Group by vendor
  const grouped = new Map<string, ModelChoice[]>();

  for (const id of ids) {
    const vendor = detectVendor(id);
    if (!grouped.has(vendor)) {
      grouped.set(vendor, []);
    }
    grouped.get(vendor)!.push({
      name: humanizeModelId(id),
      value: id,
    });
  }

  // Sort vendors alphabetically, but keep common ones first
  const vendorOrder = ["Anthropic", "OpenAI", "Google", "Amazon", "Meta"];
  const sortedVendors = Array.from(grouped.keys()).sort((a, b) => {
    const aIdx = vendorOrder.indexOf(a);
    const bIdx = vendorOrder.indexOf(b);

    // Both in priority list: sort by priority
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;

    // Only a in priority list
    if (aIdx !== -1) return -1;

    // Only b in priority list
    if (bIdx !== -1) return 1;

    // Neither in priority list: alphabetical
    return a.localeCompare(b);
  });

  // Build groups with sorted models within each group
  const groups: ModelGroup[] = [];
  for (const vendor of sortedVendors) {
    const models = grouped.get(vendor)!;
    // Sort models by name within each vendor group
    models.sort((a, b) => a.name.localeCompare(b.name));

    groups.push({
      label: vendor,
      models,
    });
  }

  return groups;
}

/** Build checkbox choices grouped by vendor for @inquirer/prompts checkbox */
export function buildCheckboxChoices(
  selectedValues?: Set<string>,
  groups?: ModelGroup[],
): ({ name: string; value: string; checked: boolean } | Separator)[] {
  const choices: ({ name: string; value: string; checked: boolean } | Separator)[] = [];
  for (const group of groups ?? MODEL_GROUPS) {
    choices.push(new Separator(chalk.bold(`─────── ${group.label} ───────`)));
    for (const m of group.models) {
      choices.push({
        name: `${m.name} ${chalk.dim(`(${m.value})`)}`,
        value: m.value,
        checked: selectedValues?.has(m.value) ?? false,
      });
    }
  }
  return choices;
}

/** Build select choices grouped by vendor for @inquirer/prompts select */
export function buildSelectChoices(
  models: ModelChoice[],
  currentValue?: string,
): ({ name: string; value: string } | Separator)[] {
  const choices: ({ name: string; value: string } | Separator)[] = [];
  for (const m of models) {
    const isCurrent = m.value === currentValue;
    choices.push({
      name: `${m.name} ${chalk.dim(`(${m.value})`)}${isCurrent ? chalk.cyan(" ← current") : ""}`,
      value: m.value,
    });
  }
  return choices;
}
