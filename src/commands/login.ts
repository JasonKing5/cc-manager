import { password } from "@inquirer/prompts";
import chalk from "chalk";
import { readSettings, writeSettings, SETTINGS_PATH } from "../lib/settings.js";

export async function loginCommand(): Promise<void> {
  const apiKey = await password({
    message: "Please enter your API Key (sk-...):",
    mask: "*",
  });

  if (!apiKey || apiKey.trim().length === 0) {
    console.log(chalk.red("Error: API Key cannot be empty."));
    process.exit(1);
  }

  const settings = await readSettings();

  const envDefaults: Record<string, string> = {
    CLAUDE_CODE_USE_BEDROCK: "1",
    CLAUDE_CODE_SKIP_BEDROCK_AUTH: "1",
    ANTHROPIC_MODEL: "us.anthropic.claude-opus-4-6-v1",
    ANTHROPIC_AUTH_TOKEN: apiKey.trim(),
    ANTHROPIC_BEDROCK_BASE_URL: "https://www.litellm.org/bedrock",
    AWS_REGION: "us-west-2",
  };

  settings.env = { ...settings.env, ...envDefaults };

  await writeSettings(settings);

  console.log(chalk.green(`✅ Configuration saved to ${SETTINGS_PATH}`));
}
