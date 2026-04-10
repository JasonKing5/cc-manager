import chalk from "chalk";
import type { Command } from "commander";
import { readSettings } from "../lib/settings.js";
import { readStore, writeStore } from "../lib/store.js";
import { fetchSpendLogs, displayHistorySummary, displayHistory } from "../lib/usage-history.js";

export function registerUsageCommand(program: Command): void {
  program
    .command("usage")
    .description("Query current API key balance and quota")
    .option("-H, --history", "Show usage history")
    .option("-v, --verbose", "Show detailed records (use with -H)")
    .option("-l, --limit <n>", "Number of days to show", "7")
    .action(usageCommand);
}

async function usageCommand(
  opts: { history?: boolean; verbose?: boolean; limit?: string },
): Promise<void> {
  const store = await readStore();
  const configName = store.active;

  let token: string | undefined;
  let baseUrl: string | undefined;

  // Try active provider first, fall back to settings.json
  if (configName && store.providers[configName]) {
    const provider = store.providers[configName];
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
  const apiBase =
    baseUrl?.replace(/\/bedrock\/?$/, "") ?? "https://www.litellm.org";

  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let spinIdx = 0;
  const spinTimer = setInterval(() => {
    process.stdout.write(`\r  ${chalk.cyan(spinner[spinIdx++ % spinner.length])} Fetching usage data...`);
  }, 80);
  const stopSpinner = () => {
    clearInterval(spinTimer);
    process.stdout.write("\r" + " ".repeat(40) + "\r");
  };

  let data: any;
  try {
    const res = await fetch(`${apiBase}/key/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      stopSpinner();
      console.log(
        chalk.red(`API request failed: ${res.status} ${res.statusText}`),
      );
      process.exit(1);
    }

    data = await res.json();
  } catch (err: any) {
    stopSpinner();
    console.log(chalk.red(`Network error: ${err.message}`));
    process.exit(1);
  }
  stopSpinner();

  const info = data.info ?? data;
  const alias = info.key_alias ?? "N/A";
  const spent = Number(info.spend ?? 0);
  const maxBudget = info.max_budget;
  const expires = info.expires;

  const today = new Date().toISOString().slice(0, 10);
  const activeProvider = configName ? store.providers[configName] : undefined;
  const baseline = activeProvider?.dailyBaseline;

  let todaySpend: number | undefined;
  let isFirstBaseline = false;

  if (configName && store.providers[configName]) {
    if (baseline?.date === today) {
      todaySpend = spent - baseline.spend;
    } else {
      const roundedSpend = Math.round(spent * 100) / 100;
      store.providers[configName].dailyBaseline = { date: today, spend: roundedSpend };
      if (!activeProvider?.baselineStartDate) {
        store.providers[configName].baselineStartDate = today;
      }
      await writeStore(store);
      todaySpend = 0;
    }
    isFirstBaseline = store.providers[configName].baselineStartDate === today;
  }

  const budgetStr =
    maxBudget != null ? `$${Number(maxBudget).toFixed(2)}` : "Unlimited";
  const remainingStr =
    maxBudget != null ? `$${(Number(maxBudget) - spent).toFixed(2)}` : "N/A";
  const expiresStr = expires
    ? new Date(expires).toLocaleString("sv-SE")
    : "Never";

  console.log("");
  console.log(chalk.bold("  Usage Summary"));
  console.log(chalk.dim("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  if (configName) {
    console.log(`  Config:    ${chalk.cyan(configName)}`);
  }
  console.log(`  Alias:      ${chalk.cyan(alias)}`);
  console.log(`  Spent:      ${chalk.yellow(`$${spent.toFixed(2)}`)}`);
  if (todaySpend !== undefined) {
    const todayLine = `  Today:      ${chalk.yellow(`$${todaySpend.toFixed(2)}`)}`;
    if (isFirstBaseline) {
      console.log(todayLine + chalk.dim("  (first day — prior spend excluded)"));
    } else {
      console.log(todayLine);
    }
  }
  console.log(`  Budget:     ${chalk.green(budgetStr)}`);
  console.log(`  Remaining:  ${chalk.green(remainingStr)}`);
  console.log(`  Expires:    ${chalk.magenta(expiresStr)}`);
  console.log("");

  // Show spend history from API
  if (opts.history) {
    const keyHash = data.key;
    if (!keyHash) {
      console.log(
        chalk.yellow("  Key hash not available from API; history requires LiteLLM with key info support."),
      );
    } else {
      const limit = parseInt(opts.limit ?? "7", 10);
      let spinIdx2 = 0;
      const spinTimer2 = setInterval(() => {
        process.stdout.write(`\r  ${chalk.cyan(spinner[spinIdx2++ % spinner.length])} Fetching spend history...`);
      }, 80);
      try {
        const entries = await fetchSpendLogs(apiBase, token, keyHash, limit);
        clearInterval(spinTimer2);
        process.stdout.write("\r" + " ".repeat(40) + "\r");
        displayHistorySummary(entries, todaySpend);
        if (opts.verbose) {
          displayHistory(entries);
        }
      } catch (err: any) {
        clearInterval(spinTimer2);
        process.stdout.write("\r" + " ".repeat(40) + "\r");
        console.log(chalk.red(`  Could not fetch spend history: ${err.message}`));
      }
    }
  }
}
