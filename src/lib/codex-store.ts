import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { writeCodexAuth, writeCodexConfigWithBaseUrl } from "./codex-files.js";

const STORE_DIR = join(homedir(), ".ccm");
const STORE_PATH = join(STORE_DIR, "codex.json");

export interface CodexConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
}

export interface CodexStore {
  active: string | null;
  configs: Record<string, CodexConfig>;
}

function defaultStore(): CodexStore {
  return { active: null, configs: {} };
}

export async function readCodexStore(): Promise<CodexStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.configs !== "object" ||
      parsed.configs === null
    ) {
      return defaultStore();
    }
    return {
      active: typeof parsed.active === "string" ? parsed.active : null,
      configs: parsed.configs,
    };
  } catch (err: any) {
    if (err.code === "ENOENT") return defaultStore();
    if (err instanceof SyntaxError) return defaultStore();
    throw err;
  }
}

export async function writeCodexStore(store: CodexStore): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2) + "\n");
}

/**
 * Apply a codex config to ~/.codex/auth.json and ~/.codex/config.toml.
 */
export async function applyCodexConfig(config: CodexConfig): Promise<void> {
  await writeCodexAuth(config.apiKey);
  await writeCodexConfigWithBaseUrl(config.baseUrl);
}
