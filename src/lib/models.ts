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
      { name: "Claude Opus 4.6 (Preview)", value: "us.anthropic.claude-opus-4-6-v1" },
      { name: "Claude Opus 4.5 (Preview)", value: "us.anthropic.claude-opus-4-5-20251101-v1:0" },
      { name: "Claude Opus 4.1", value: "us.anthropic.claude-opus-4-1-20250805-v1:0" },
      { name: "Claude Opus 4", value: "us.anthropic.claude-opus-4-20250514-v1:0" },
      { name: "Claude Sonnet 4.5 (Preview)", value: "us.anthropic.claude-sonnet-4-5-20250929-v1:0" },
      { name: "Claude Sonnet 4", value: "us.anthropic.claude-sonnet-4-20250514-v1:0" },
      { name: "Claude Haiku 4.5 (Preview)", value: "us.anthropic.claude-haiku-4-5-20251001-v1:0" },
      { name: "Claude 3.7 Sonnet", value: "us.anthropic.claude-3-7-sonnet-20250219-v1:0" },
      { name: "Claude 3.5 Sonnet (v2)", value: "us.anthropic.claude-3-5-sonnet-20241022-v2:0" },
      { name: "Claude 3.5 Sonnet (v1)", value: "us.anthropic.claude-3-5-sonnet-20240620-v1:0" },
      { name: "Claude 3.5 Haiku", value: "us.anthropic.claude-3-5-haiku-20241022-v1:0" },
      { name: "Claude 3 Opus", value: "us.anthropic.claude-3-opus-20240229-v1:0" },
      { name: "Claude 3 Sonnet", value: "us.anthropic.claude-3-sonnet-20240229-v1:0" },
      { name: "Claude 3 Haiku", value: "us.anthropic.claude-3-haiku-20240307-v1:0" },
    ],
  },
  {
    label: "OpenAI (GPT)",
    models: [
      { name: "GPT-5.2 (Flagship)", value: "gpt-5.2" },
      { name: "GPT-5.2 Codex", value: "gpt-5.2-codex" },
      { name: "GPT-5.1", value: "gpt-5.1" },
      { name: "GPT-5.1 Chat", value: "gpt-5.1-chat" },
      { name: "GPT-5.1 Codex", value: "gpt-5.1-codex" },
      { name: "GPT-5.1 Codex Max", value: "gpt-5.1-codex-max" },
      { name: "GPT-5.1 Codex Mini", value: "gpt-5.1-codex-mini" },
      { name: "GPT-5", value: "gpt-5" },
      { name: "GPT-5 Pro", value: "gpt-5-pro" },
      { name: "GPT-5 Chat", value: "gpt-5-chat" },
      { name: "GPT-5 Codex", value: "gpt-5-codex" },
      { name: "GPT-5 Mini", value: "gpt-5-mini" },
      { name: "GPT-5 Nano", value: "gpt-5-nano" },
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
      { name: "Gemini 2.0 Flash", value: "gemini/gemini-2.0-flash" },
      { name: "Gemini 2.0 Flash 001", value: "gemini/gemini-2.0-flash-001" },
      { name: "Gemini 2.0 Flash Lite", value: "gemini/gemini-2.0-flash-lite" },
    ],
  },
  {
    label: "Amazon & Others",
    models: [
      { name: "Amazon Nova Pro", value: "us.amazon.nova-pro-v1:0" },
      { name: "Amazon Nova 2 Lite", value: "us.amazon.nova-2-lite-v1:0" },
      { name: "Writer Palmyra X4", value: "us.writer.palmyra-x4-v1:0" },
      { name: "Veo 3.1 (Preview)", value: "vertex_ai/veo-3.1-generate-preview" },
    ],
  },
  {
    label: "Embeddings",
    models: [
      { name: "Text Embedding Ada 002", value: "text-embedding-ada-002" },
      { name: "Text Embedding 3 Small", value: "text-embedding-3-small" },
      { name: "Text Embedding 3 Large", value: "text-embedding-3-large" },
    ],
  },
];

/** Flat list of all models (no separators) for programmatic use */
export const ALL_MODELS: ModelChoice[] = MODEL_GROUPS.flatMap((g) => g.models);

/** Build checkbox choices grouped by vendor for @inquirer/prompts checkbox */
export function buildCheckboxChoices(
  selectedValues?: Set<string>,
): ({ name: string; value: string; checked: boolean } | Separator)[] {
  const choices: ({ name: string; value: string; checked: boolean } | Separator)[] = [];
  for (const group of MODEL_GROUPS) {
    choices.push(new Separator(chalk.bold(`─────── ${group.label} ───────`)));
    for (const m of group.models) {
      choices.push({
        name: `${m.name.padEnd(30)} ${m.value}`,
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
      name: `${m.name.padEnd(30)} ${m.value}${isCurrent ? chalk.cyan(" (current)") : ""}`,
      value: m.value,
    });
  }
  return choices;
}
