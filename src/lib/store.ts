import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { readSettings, writeSettings } from "./settings.js";

const STORE_DIR = join(homedir(), ".claude");
const STORE_PATH = join(STORE_DIR, "ccm.json");

export interface ProviderConfig {
  name: string;
  env: Record<string, string>;
  models: { name: string; value: string }[];
}

export interface CcmStore {
  active: string | null;
  providers: Record<string, ProviderConfig>;
}

/** Keys in settings.json env that ccm manages */
const CCM_ENV_KEYS = [
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_SKIP_BEDROCK_AUTH",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BEDROCK_BASE_URL",
  "AWS_REGION",
  "ANTHROPIC_MODEL",
] as const;

function defaultStore(): CcmStore {
  return { active: null, providers: {} };
}

export async function readStore(): Promise<CcmStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.providers !== "object" ||
      parsed.providers === null
    ) {
      return defaultStore();
    }
    return {
      active: typeof parsed.active === "string" ? parsed.active : null,
      providers: parsed.providers,
    };
  } catch (err: any) {
    if (err.code === "ENOENT") return defaultStore();
    if (err instanceof SyntaxError) return defaultStore();
    throw err;
  }
}

export async function writeStore(store: CcmStore): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2) + "\n");
}

/**
 * Apply a provider's env to settings.json.
 * Clears all ccm-managed keys first, then merges the provider's env.
 */
export async function applyToSettings(
  providerEnv: Record<string, string>,
): Promise<void> {
  const settings = await readSettings();
  const env = { ...settings.env };

  // Clear all ccm-managed keys
  for (const key of CCM_ENV_KEYS) {
    delete env[key];
  }

  // Apply provider's env
  settings.env = { ...env, ...providerEnv };
  await writeSettings(settings);
}

/**
 * Clear ccm-managed keys from settings.json (used when removing active provider).
 */
export async function clearSettings(): Promise<void> {
  const settings = await readSettings();
  const env = { ...settings.env };
  for (const key of CCM_ENV_KEYS) {
    delete env[key];
  }
  settings.env = env;
  await writeSettings(settings);
}
