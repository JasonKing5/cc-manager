import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CODEX_DIR = join(homedir(), ".codex");
const AUTH_PATH = join(CODEX_DIR, "auth.json");
const CONFIG_PATH = join(CODEX_DIR, "config.toml");

export interface CodexAuth {
  OPENAI_API_KEY?: string;
  [key: string]: string | undefined;
}

export async function readCodexAuth(): Promise<CodexAuth> {
  try {
    const raw = await readFile(AUTH_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function writeCodexAuth(apiKey: string): Promise<void> {
  await mkdir(CODEX_DIR, { recursive: true });
  try {
    await copyFile(AUTH_PATH, AUTH_PATH + ".bak");
  } catch {
    // No existing file to back up — that's fine
  }
  await writeFile(AUTH_PATH, JSON.stringify({ OPENAI_API_KEY: apiKey }, null, 2) + "\n");
}

export async function readCodexConfigRaw(): Promise<string> {
  try {
    return await readFile(CONFIG_PATH, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Read the current base_url from config.toml (from [model_providers.*] section).
 */
export async function readCodexBaseUrl(): Promise<string | undefined> {
  const raw = await readCodexConfigRaw();
  const match = raw.match(/\[model_providers\.[^\]]+\][^[]*?base_url\s*=\s*"([^"]+)"/s);
  return match?.[1];
}

/**
 * Update base_url in ~/.codex/config.toml using a line-by-line approach.
 * - Strips all [projects.*] sections
 * - Replaces existing base_url if found inside any [model_providers.*] section
 * - Inserts base_url if the section exists but the key is missing
 * - Appends a new [model_providers.OpenAI] section if none exists
 * Never produces duplicate keys.
 */
export async function writeCodexConfigWithBaseUrl(baseUrl: string): Promise<void> {
  await mkdir(CODEX_DIR, { recursive: true });
  const raw = await readCodexConfigRaw();

  try {
    await copyFile(CONFIG_PATH, CONFIG_PATH + ".bak");
  } catch {
    // No existing file to back up — that's fine
  }

  // Strip all [projects.*] sections, then normalize blank lines
  const stripped = raw
    .replace(/\[projects\.[^\]]+\][^[]*/gs, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();

  const lines = stripped.split("\n");
  const result: string[] = [];
  let inModelProviders = false;
  let foundModelProviders = false;
  let baseUrlWritten = false;

  for (const line of lines) {
    if (/^\[model_providers\./.test(line)) {
      inModelProviders = true;
      foundModelProviders = true;
      result.push(line);
      continue;
    }

    if (/^\[/.test(line)) {
      // Leaving model_providers section — inject base_url before next section if not yet written
      if (inModelProviders && !baseUrlWritten) {
        result.push(`base_url = "${baseUrl}"`);
        baseUrlWritten = true;
      }
      inModelProviders = false;
      result.push(line);
      continue;
    }

    if (inModelProviders && /^base_url\s*=/.test(line)) {
      // Replace existing base_url line
      result.push(`base_url = "${baseUrl}"`);
      baseUrlWritten = true;
      continue;
    }

    result.push(line);
  }

  // model_providers section was at end of file and base_url not yet written
  if (inModelProviders && !baseUrlWritten) {
    result.push(`base_url = "${baseUrl}"`);
    baseUrlWritten = true;
  }

  // No model_providers section at all — append one
  if (!foundModelProviders) {
    result.push("", "[model_providers.OpenAI]", `base_url = "${baseUrl}"`);
  }

  await writeFile(CONFIG_PATH, result.join("\n") + "\n");
}
