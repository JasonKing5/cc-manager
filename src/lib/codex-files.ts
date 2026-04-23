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
 * Update base_url in ~/.codex/config.toml.
 * Replaces the base_url line within any [model_providers.*] section.
 * If the section/key doesn't exist, appends an [model_providers.OpenAI] section.
 */
export async function writeCodexConfigWithBaseUrl(baseUrl: string): Promise<void> {
  await mkdir(CODEX_DIR, { recursive: true });
  let content = await readCodexConfigRaw();

  try {
    await copyFile(CONFIG_PATH, CONFIG_PATH + ".bak");
  } catch {
    // No existing file to back up — that's fine
  }

  // Strip all [projects.*] sections (each spans until the next section or EOF)
  content = content.replace(/\[projects\.[^\]]+\][^[]*/gs, "").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

  // Replace base_url inside any [model_providers.*] section
  const updated = content.replace(
    /(\[model_providers\.[^\]]+\][^[]*?base_url\s*=\s*)"[^"]*"/s,
    `$1"${baseUrl}"`,
  );

  if (updated !== content) {
    await writeFile(CONFIG_PATH, updated);
    return;
  }

  // Section exists but no base_url key — inject it
  const injected = content.replace(
    /(\[model_providers\.[^\]]+\])/,
    `$1\nbase_url = "${baseUrl}"`,
  );

  if (injected !== content) {
    await writeFile(CONFIG_PATH, injected);
    return;
  }

  // No model_providers section at all — append one
  const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  await writeFile(
    CONFIG_PATH,
    content + separator + `\n[model_providers.OpenAI]\nbase_url = "${baseUrl}"\n`,
  );
}
