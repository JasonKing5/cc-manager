import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const SETTINGS_DIR = join(homedir(), ".claude");
const SETTINGS_PATH = join(SETTINGS_DIR, "settings.json");
const SETTINGS_BACKUP_PATH = join(SETTINGS_DIR, "settings.json.bak");

export const GLOBAL_LOCAL_PATH = join(SETTINGS_DIR, "settings.local.json");

export function projectLocalPath(): string {
  return join(process.cwd(), ".claude", "settings.local.json");
}

export async function readSettings(): Promise<Record<string, any>> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err: any) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

export async function writeSettings(
  settings: Record<string, any>,
): Promise<void> {
  await mkdir(SETTINGS_DIR, { recursive: true });
  // Auto-backup before writing
  try {
    await copyFile(SETTINGS_PATH, SETTINGS_BACKUP_PATH);
  } catch {
    // No existing file to back up — that's fine
  }
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
}

export async function readLocalSettings(
  filePath: string,
): Promise<Record<string, any>> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err: any) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

export async function writeLocalSettings(
  filePath: string,
  data: Record<string, any>,
): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  try {
    await copyFile(filePath, filePath + ".bak");
  } catch {
    // No existing file to back up — that's fine
  }
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
}

export { SETTINGS_PATH };
