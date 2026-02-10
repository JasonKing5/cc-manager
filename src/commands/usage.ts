import chalk from "chalk";
import { readSettings } from "../lib/settings.js";

export async function usageCommand(): Promise<void> {
  const settings = await readSettings();
  const token = settings.env?.ANTHROPIC_AUTH_TOKEN;

  if (!token) {
    console.log(
      chalk.yellow(
        "No API Key found. Please run `ccm login` first to configure your credentials.",
      ),
    );
    process.exit(1);
  }

  let data: any;
  try {
    const res = await fetch("http://www.litellm.org/key/info", {
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
  console.log(`  Alias:      ${chalk.cyan(alias)}`);
  console.log(`  Spent:      ${chalk.yellow(`$${spent.toFixed(2)}`)}`);
  console.log(`  Budget:     ${chalk.green(budgetStr)}`);
  console.log(`  Remaining:  ${chalk.green(remainingStr)}`);
  console.log(`  Expires:    ${chalk.magenta(expiresStr)}`);
  console.log("");
}
