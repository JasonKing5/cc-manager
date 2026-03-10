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
  dynamicModels?: boolean;
}

// ---------- Provider-specific model groups ----------

const BEDROCK_CLAUDE_MODELS: ModelGroup = {
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
    { name: "Claude Haiku 4", value: "us.anthropic.claude-haiku-4-20250514-v1:0" },
    { name: "Claude 3.7 Sonnet", value: "us.anthropic.claude-3-7-sonnet-20250219-v1:0" },
    { name: "Claude 3.5 Sonnet v2", value: "us.anthropic.claude-3-5-sonnet-20241022-v2:0" },
    { name: "Claude 3.5 Haiku", value: "us.anthropic.claude-3-5-haiku-20241022-v1:0" },
  ],
};

const BEDROCK_OTHER_MODELS: ModelGroup = {
  label: "Amazon & Others",
  models: [
    { name: "Amazon Nova Pro", value: "us.amazon.nova-pro-v1:0" },
    { name: "Amazon Nova Lite", value: "us.amazon.nova-lite-v1:0" },
    { name: "Amazon Nova Micro", value: "us.amazon.nova-micro-v1:0" },
    { name: "Llama 4 Maverick", value: "us.meta.llama4-maverick-17b-instruct-v1:0" },
  ],
};

const VERTEX_CLAUDE_MODELS: ModelGroup = {
  label: "Anthropic (Claude)",
  models: [
    { name: "Claude Opus 4.6", value: "claude-opus-4-6@latest" },
    { name: "Claude Sonnet 4.6", value: "claude-sonnet-4-6@latest" },
    { name: "Claude Opus 4.5", value: "claude-opus-4-5@20251101" },
    { name: "Claude Sonnet 4.5", value: "claude-sonnet-4-5@20250929" },
    { name: "Claude Haiku 4.5", value: "claude-haiku-4-5@20251001" },
    { name: "Claude Opus 4.1", value: "claude-opus-4-1@20250805" },
    { name: "Claude Opus 4", value: "claude-opus-4@20250514" },
    { name: "Claude Sonnet 4", value: "claude-sonnet-4@20250514" },
    { name: "Claude Haiku 4", value: "claude-haiku-4@20250514" },
    { name: "Claude 3.7 Sonnet", value: "claude-3-7-sonnet@20250219" },
    { name: "Claude 3.5 Sonnet v2", value: "claude-3-5-sonnet-v2@20241022" },
    { name: "Claude 3.5 Haiku", value: "claude-3-5-haiku@20241022" },
  ],
};

const VERTEX_GEMINI_MODELS: ModelGroup = {
  label: "Google (Gemini)",
  models: [
    { name: "Gemini 3 Pro (Preview)", value: "gemini-3-pro-preview" },
    { name: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
    { name: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
  ],
};

const DEEPSEEK_MODELS: ModelGroup = {
  label: "DeepSeek",
  models: [
    { name: "DeepSeek V3 (Chat)", value: "deepseek-chat" },
    { name: "DeepSeek R1 (Reasoning)", value: "deepseek-reasoner" },
  ],
};

const OPENROUTER_MODELS: ModelGroup = {
  label: "OpenRouter (Popular)",
  models: [
    { name: "Claude Opus 4.6", value: "anthropic/claude-opus-4.6" },
    { name: "Claude Sonnet 4.6", value: "anthropic/claude-sonnet-4.6" },
    { name: "Claude Opus 4.5", value: "anthropic/claude-opus-4.5" },
    { name: "Claude Haiku 4.5", value: "anthropic/claude-haiku-4.5" },
    { name: "GPT-5.2", value: "openai/gpt-5.2" },
    { name: "Gemini 3 Pro (Preview)", value: "google/gemini-3-pro-preview" },
    { name: "Gemini 2.5 Pro", value: "google/gemini-2.5-pro" },
    { name: "DeepSeek R1", value: "deepseek/deepseek-r1" },
    { name: "DeepSeek V3", value: "deepseek/deepseek-chat" },
    { name: "DeepSeek V3.2", value: "deepseek/deepseek-v3.2" },
    { name: "Llama 4 Maverick", value: "meta-llama/llama-4-maverick" },
    { name: "Qwen3.5 Plus", value: "qwen/qwen3.5-plus" },
    { name: "Mistral Large", value: "mistralai/mistral-large" },
  ],
};

const KIMI_MODELS: ModelGroup = {
  label: "Kimi (Moonshot)",
  models: [
    { name: "Kimi K2.5", value: "kimi-k2.5" },
    { name: "Kimi K2 Thinking", value: "kimi-k2-thinking" },
    { name: "Kimi K2", value: "kimi-k2" },
    { name: "Kimi Latest 128K", value: "kimi-latest-128k" },
    { name: "Kimi Latest 32K", value: "kimi-latest-32k" },
    { name: "Kimi Latest 8K", value: "kimi-latest-8k" },
  ],
};

const ZHIPU_MODELS: ModelGroup = {
  label: "Zhipu AI (GLM)",
  models: [
    { name: "GLM-5", value: "glm-5" },
    { name: "GLM-4.7", value: "glm-4.7" },
    { name: "GLM-4.7 Flash", value: "glm-4.7-flash" },
    { name: "GLM-4.6", value: "glm-4.6" },
    { name: "GLM-4.5", value: "glm-4.5" },
    { name: "GLM-4.5 Air", value: "glm-4.5-air" },
  ],
};

const OLLAMA_MODELS: ModelGroup = {
  label: "Ollama (Local)",
  models: [
    { name: "Llama 4 Maverick", value: "llama4-maverick:latest" },
    { name: "Llama 3.3 70B", value: "llama3.3:70b" },
    { name: "Llama 3.2 3B", value: "llama3.2:3b" },
    { name: "DeepSeek V3", value: "deepseek-v3:latest" },
    { name: "DeepSeek R1 14B", value: "deepseek-r1:14b" },
    { name: "DeepSeek R1 32B", value: "deepseek-r1:32b" },
    { name: "Qwen3 30B", value: "qwen3:30b" },
    { name: "Qwen 2.5 Coder 32B", value: "qwen2.5-coder:32b" },
    { name: "Qwen 2.5 Coder 7B", value: "qwen2.5-coder:7b" },
    { name: "Codestral 22B", value: "codestral:22b" },
    { name: "Phi-4 14B", value: "phi4:14b" },
    { name: "Mistral 7B", value: "mistral:7b" },
  ],
};

const QWEN_MODELS: ModelGroup = {
  label: "Qwen (Alibaba)",
  models: [
    { name: "Qwen3.5 Plus", value: "qwen3.5-plus" },
    { name: "Qwen3.5 Flash", value: "qwen3.5-flash" },
    { name: "Qwen3 Max", value: "qwen3-max" },
    { name: "Qwen3 Coder Plus", value: "qwen3-coder-plus" },
    { name: "Qwen3 Coder Flash", value: "qwen3-coder-flash" },
    { name: "Qwen Plus", value: "qwen-plus" },
    { name: "Qwen Turbo", value: "qwen-turbo" },
  ],
};

const SILICONFLOW_MODELS: ModelGroup = {
  label: "SiliconFlow (Popular)",
  models: [
    { name: "DeepSeek V3", value: "Pro/deepseek-ai/DeepSeek-V3" },
    { name: "DeepSeek R1", value: "Pro/deepseek-ai/DeepSeek-R1" },
    { name: "Qwen 2.5 Coder 32B", value: "Qwen/Qwen2.5-Coder-32B-Instruct" },
    { name: "Qwen 2.5 72B", value: "Qwen/Qwen2.5-72B-Instruct" },
  ],
};

const AZURE_CLAUDE_MODELS: ModelGroup = {
  label: "Anthropic (Claude)",
  models: [
    { name: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
    { name: "Claude 3.7 Sonnet", value: "claude-3-7-sonnet-20250219" },
    { name: "Claude 3.5 Sonnet v2", value: "claude-3-5-sonnet-20241022-v2" },
    { name: "Claude 3.5 Haiku", value: "claude-3-5-haiku-20241022" },
  ],
};

// ---------- Templates ----------

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    id: "litellm",
    name: "LiteLLM Proxy",
    description: "Connect through a LiteLLM proxy server (Bedrock mode)",
    envFields: [
      { key: "CLAUDE_CODE_USE_BEDROCK", label: "", fixed: "1" },
      { key: "CLAUDE_CODE_SKIP_BEDROCK_AUTH", label: "", fixed: "1" },
      { key: "ANTHROPIC_BEDROCK_BASE_URL", label: "Proxy Base URL", default: "https://www.litellm.org/bedrock" },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", secret: true, required: true },
      { key: "AWS_REGION", label: "AWS Region", default: "us-west-2" },
    ],
    models: [],
    dynamicModels: true,
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    description: "Direct AWS Bedrock access",
    envFields: [
      { key: "CLAUDE_CODE_USE_BEDROCK", label: "", fixed: "1" },
      { key: "AWS_REGION", label: "AWS Region", default: "us-west-2", required: true },
      { key: "AWS_ACCESS_KEY_ID", label: "AWS Access Key ID", required: true },
      { key: "AWS_SECRET_ACCESS_KEY", label: "AWS Secret Access Key", secret: true, required: true },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "us.anthropic.claude-3-5-haiku-20241022-v1:0" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [BEDROCK_CLAUDE_MODELS, BEDROCK_OTHER_MODELS],
  },
  {
    id: "vertex",
    name: "Google Vertex AI",
    description: "Google Cloud Vertex AI (uses gcloud ADC)",
    envFields: [
      { key: "CLAUDE_CODE_USE_VERTEX", label: "", fixed: "1" },
      { key: "CLOUD_ML_REGION", label: "Cloud ML Region", default: "us-east5", required: true },
      { key: "ANTHROPIC_VERTEX_PROJECT_ID", label: "GCP Project ID", required: true },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "claude-3-5-haiku@20241022" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [VERTEX_CLAUDE_MODELS, VERTEX_GEMINI_MODELS],
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
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "OpenRouter API — access 346+ models from all providers",
    envFields: [
      { key: "ANTHROPIC_BASE_URL", label: "", fixed: "https://openrouter.ai/api/v1" },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", secret: true, required: true },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "anthropic/claude-haiku-4.5" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [OPENROUTER_MODELS],
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    description: "Moonshot AI / Kimi API",
    envFields: [
      { key: "ANTHROPIC_BASE_URL", label: "", fixed: "https://api.moonshot.cn/v1" },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", secret: true, required: true },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "kimi-latest-8k" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [KIMI_MODELS],
  },
  {
    id: "zhipu",
    name: "Zhipu AI (z.ai / GLM)",
    description: "Zhipu AI / GLM / ChatGLM API",
    envFields: [
      { key: "ANTHROPIC_BASE_URL", label: "", fixed: "https://open.bigmodel.cn/api/paas/v4" },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", secret: true, required: true },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "glm-4.7-flash" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [ZHIPU_MODELS],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    description: "Local Ollama instance — no API key required",
    envFields: [
      { key: "ANTHROPIC_BASE_URL", label: "Ollama Base URL", default: "http://localhost:11434" },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "", fixed: "ollama" },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "qwen3:30b" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [OLLAMA_MODELS],
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    description: "Alibaba Qwen / DashScope API",
    envFields: [
      { key: "ANTHROPIC_BASE_URL", label: "", fixed: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", secret: true, required: true },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "qwen-plus" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [QWEN_MODELS],
  },
  {
    id: "siliconflow",
    name: "SiliconFlow (硅基流动)",
    description: "SiliconFlow API — fast & affordable model aggregator (China)",
    envFields: [
      { key: "ANTHROPIC_BASE_URL", label: "", fixed: "https://api.siliconflow.cn/v1" },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", secret: true, required: true },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "Qwen/Qwen2.5-Coder-32B-Instruct" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [SILICONFLOW_MODELS],
  },
  {
    id: "azure",
    name: "Azure AI Foundry",
    description: "Microsoft Azure AI — enterprise Claude access",
    envFields: [
      { key: "ANTHROPIC_BASE_URL", label: "Azure Endpoint URL", required: true },
      { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", secret: true, required: true },
      { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", default: "600000" },
      { key: "ANTHROPIC_SMALL_FAST_MODEL", label: "Small/Fast Model", default: "claude-3-5-haiku" },
      { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "", fixed: "1" },
    ],
    models: [AZURE_CLAUDE_MODELS],
  },
];

export function findTemplate(id: string): ProviderTemplate | undefined {
  return PROVIDER_TEMPLATES.find((t) => t.id === id);
}
