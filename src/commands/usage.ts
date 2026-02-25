import chalk from "chalk";
import { readSettings } from "../lib/settings.js";
import { readStore } from "../lib/store.js";

export async function usageCommand(): Promise<void> {
  const store = await readStore();
  let token: string | undefined;
  let baseUrl: string | undefined;

  // Try active provider first, fall back to settings.json
  if (store.active && store.providers[store.active]) {
    const provider = store.providers[store.active];
    token = provider.env.ANTHROPIC_AUTH_TOKEN;
    baseUrl = provider.env.ANTHROPIC_BEDROCK_BASE_URL;
  } else {
    const settings = await readSettings();
    token = settings.env?.ANTHROPIC_AUTH_TOKEN;
    baseUrl = settings.env?.ANTHROPIC_BEDROCK_BASE_URL;
  }

  if (!token) {
    console.log(
      chalk.yellow(
        "No API Key found. Run `ccm add` to create a configuration.",
      ),
    );
    process.exit(1);
  }

  // Derive API base from proxy URL (strip /bedrock suffix)
  const apiBase = baseUrl?.replace(/\/bedrock\/?$/, "") ?? "https://www.litellm.org";

  let data: any;
  try {
    const res = await fetch(`${apiBase}/key/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.log(
        chalk.red(`API request failed: ${res.status} ${res.statusText}`),
      );
      process.exit(1);
    }

    data = await res.json();
  } catch (err: any) {
    console.log(chalk.red(`Network error: ${err.message}`));
    process.exit(1);
  }

  const info = data.info ?? data;
  const alias = info.key_alias ?? "N/A";
  const spent = Number(info.spend ?? 0);
  const maxBudget = info.max_budget;
  const expires = info.expires;

  const budgetStr =
    maxBudget != null ? `$${Number(maxBudget).toFixed(2)}` : "Unlimited";
  const remainingStr =
    maxBudget != null ? `$${(Number(maxBudget) - spent).toFixed(2)}` : "N/A";
  const expiresStr = expires
    ? new Date(expires).toLocaleString("sv-SE")
    : "Never";

  console.log("");
  console.log(chalk.bold("  Usage Summary"));
  console.log(chalk.dim("  ─────────────────────────────"));
  if (store.active) {
    console.log(`  Config:    ${chalk.cyan(store.active)}`);
  }
  console.log(`  Alias:      ${chalk.cyan(alias)}`);
  console.log(`  Spent:      ${chalk.yellow(`$${spent.toFixed(2)}`)}`);
  console.log(`  Budget:     ${chalk.green(budgetStr)}`);
  console.log(`  Remaining:  ${chalk.green(remainingStr)}`);
  console.log(`  Expires:    ${chalk.magenta(expiresStr)}`);
  console.log("");
}
