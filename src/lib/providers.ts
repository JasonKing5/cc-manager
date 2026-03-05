import type { ModelGroup } from "./models.js";

export interface ProviderEnvField {
  key: string;
  label: string;
  secret?: boolean;
  default?: string;
  required?: boolean;
  fixed?: string;
}

export interface ProviderTemplate {
  id: string;
  name: string;
  description: string;
  envFields: ProviderEnvField[];
  models: ModelGroup[];
}

// ---------- Provider-specific model groups ----------

const DEEPSEEK_MODELS: ModelGroup = {
  label: "DeepSeek",
  models: [
    { name: "DeepSeek-V3", value: "deepseek-chat" },
    { name: "DeepSeek-R1", value: "deepseek-reasoner" },
    { name: "DeepSeek-Coder-V2", value: "deepseek-coder" },
  ],
};

// ---------- Templates ----------

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    id: "litellm",
    name: "LiteLLM Proxy",
    description: "Connect through a LiteLLM proxy server",
    envFields: [
      { key: "ANTHROPIC_BASE_URL", label: "Proxy Base URL", required: true },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", secret: true, required: true },
    ],
    models: [],
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    description: "Direct AWS Bedrock access",
    envFields: [
      { key: "CLAUDE_CODE_USE_BEDROCK", label: "", fixed: "1" },
      { key: "AWS_REGION", label: "AWS Region", default: "us-east-1", required: true },
      { key: "AWS_ACCESS_KEY_ID", label: "AWS Access Key ID", required: true },
      { key: "AWS_SECRET_ACCESS_KEY", label: "AWS Secret Access Key", secret: true, required: true },
    ],
    models: [],
  },
  {
    id: "vertex",
    name: "Google Vertex AI",
    description: "Google Cloud Vertex AI (uses gcloud ADC)",
    envFields: [
      { key: "CLAUDE_CODE_USE_VERTEX", label: "", fixed: "1" },
      { key: "CLOUD_ML_REGION", label: "Cloud ML Region", default: "us-east5", required: true },
      { key: "ANTHROPIC_VERTEX_PROJECT_ID", label: "GCP Project ID", required: true },
    ],
    models: [],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek API (native Anthropic format)",
    envFields: [
      { key: "ANTHROPIC_BASE_URL", label: "", fixed: "https://api.deepseek.com/anthropic" },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", secret: true, required: true },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "deepseek-chat" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [DEEPSEEK_MODELS],
  },
];

export function findTemplate(id: string): ProviderTemplate | undefined {
  return PROVIDER_TEMPLATES.find((t) => t.id === id);
}
