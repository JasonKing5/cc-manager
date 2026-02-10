import { Separator } from "@inquirer/prompts";

interface ModelChoice {
  name: string;
  value: string;
}

export const MODEL_CHOICES: (ModelChoice | Separator)[] = [
  new Separator("── Anthropic (Claude) ──"),
  {
    name: "Claude Opus 4.6 (Preview)   us.anthropic.claude-opus-4-6-v1",
    value: "us.anthropic.claude-opus-4-6-v1",
  },
  {
    name: "Claude Opus 4.5 (Preview)   us.anthropic.claude-opus-4-5-20251101-v1:0",
    value: "us.anthropic.claude-opus-4-5-20251101-v1:0",
  },
  {
    name: "Claude Sonnet 4.5 (Preview) us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    value: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  },
  {
    name: "Claude Haiku 4.5 (Preview)  us.anthropic.claude-haiku-4-5-20251001-v1:0",
    value: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  },
  {
    name: "Claude 3.7 Sonnet            us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    value: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
  },
  {
    name: "Claude 3.5 Sonnet (v2)       us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    value: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  },
  {
    name: "Claude 3.5 Sonnet (v1)       us.anthropic.claude-3-5-sonnet-20240620-v1:0",
    value: "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
  },
  {
    name: "Claude 3.5 Haiku             us.anthropic.claude-3-5-haiku-20241022-v1:0",
    value: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
  },
  {
    name: "Claude 3 Opus                us.anthropic.claude-3-opus-20240229-v1:0",
    value: "us.anthropic.claude-3-opus-20240229-v1:0",
  },
  {
    name: "Claude 3 Sonnet              us.anthropic.claude-3-sonnet-20240229-v1:0",
    value: "us.anthropic.claude-3-sonnet-20240229-v1:0",
  },
  {
    name: "Claude 3 Haiku               us.anthropic.claude-3-haiku-20240307-v1:0",
    value: "us.anthropic.claude-3-haiku-20240307-v1:0",
  },

  new Separator("── OpenAI (GPT) ──"),
  {
    name: "GPT-5.2 (Flagship)           gpt-5.2",
    value: "gpt-5.2",
  },
  {
    name: "GPT-5.1 Codex Max            gpt-5.1-codex-max",
    value: "gpt-5.1-codex-max",
  },
  {
    name: "GPT-5.1 Codex Mini           gpt-5.1-codex-mini",
    value: "gpt-5.1-codex-mini",
  },
  {
    name: "GPT-5 Pro                    gpt-5-pro",
    value: "gpt-5-pro",
  },
  {
    name: "GPT-5 Chat                   gpt-5-chat",
    value: "gpt-5-chat",
  },
  {
    name: "GPT-4o                       gpt-4o",
    value: "gpt-4o",
  },
  {
    name: "o4 Mini                      o4-mini",
    value: "o4-mini",
  },

  new Separator("── Google (Gemini) ──"),
  {
    name: "Gemini 3 Pro (Preview)       gemini/gemini-3-pro-preview",
    value: "gemini/gemini-3-pro-preview",
  },
  {
    name: "Gemini 2.5 Pro               gemini/gemini-2.5-pro",
    value: "gemini/gemini-2.5-pro",
  },
  {
    name: "Gemini 2.0 Flash             gemini/gemini-2.0-flash",
    value: "gemini/gemini-2.0-flash",
  },
  {
    name: "Gemini 2.0 Flash Lite        gemini/gemini-2.0-flash-lite",
    value: "gemini/gemini-2.0-flash-lite",
  },

  new Separator("── Amazon & Others ──"),
  {
    name: "Amazon Nova Pro              us.amazon.nova-pro-v1:0",
    value: "us.amazon.nova-pro-v1:0",
  },
  {
    name: "Writer Palmyra X4            us.writer.palmyra-x4-v1:0",
    value: "us.writer.palmyra-x4-v1:0",
  },
];
