import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const SETTINGS_DIR = join(homedir(), ".claude");
const SETTINGS_PATH = join(SETTINGS_DIR, "settings.json");
const SETTINGS_BACKUP_PATH = join(SETTINGS_DIR, "settings.json.bak");

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

export { SETTINGS_PATH };
