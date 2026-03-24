import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";

const HISTORY_PATH = join(homedir(), ".claude", "ccm-usage-history.json");

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

function padColored(s: string, width: number): string {
  const visible = stripAnsi(s).length;
  return s + " ".repeat(Math.max(0, width - visible));
}

interface UsageEntry {
  timestamp: string;
  spend: number;
  maxBudget: number | null;
}

type UsageHistory = Record<string, UsageEntry[]>;

export async function readHistory(): Promise<UsageHistory> {
  try {
    const raw = await readFile(HISTORY_PATH, "utf-8");
    return JSON.parse(raw) as UsageHistory;
  } catch {
    return {};
  }
}

async function writeHistory(history: UsageHistory): Promise<void> {
  await writeFile(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n");
}

export async function recordEntry(
  configName: string,
  spend: number,
  maxBudget: number | null,
): Promise<void> {
  const history = await readHistory();
  const entries = history[configName] ?? [];

  entries.push({
    timestamp: new Date().toISOString(),
    spend,
    maxBudget,
  });

  history[configName] = entries;
  await writeHistory(history);
}

export async function displayHistory(
  configName: string,
  limit: number,
): Promise<void> {
  const history = await readHistory();
  const entries = history[configName];

  if (!entries || entries.length === 0) {
    console.log(
      chalk.yellow(
        `No usage history for '${configName}'. Run \`ccm usage\` to start recording.`,
      ),
    );
    return;
  }

  const shown = entries.slice(-limit);

  // Group entries by date
  const grouped = new Map<string, UsageEntry[]>();
  for (const e of shown) {
    const day = e.timestamp.slice(0, 10);
    const group = grouped.get(day);
    if (group) group.push(e);
    else grouped.set(day, [e]);
  }
  const dayKeys = [...grouped.keys()];

  // Build daily-last map for inter-day delta
  const dailyLast = new Map<string, UsageEntry>();
  for (const [day, group] of grouped) {
    dailyLast.set(day, group[group.length - 1]);
  }
  const daily = [...dailyLast.values()];

  // Table
  const sep = "\u2500".repeat(62);
  console.log("");
  console.log(chalk.bold(`  Usage History (${configName})`));
  console.log(chalk.dim(`  ${sep}`));
  console.log(
    chalk.dim(
      `  ${"Date".padEnd(18)}${"Spent".padEnd(11)}${"Remaining".padEnd(12)}${"Delta".padEnd(11)}Daily`,
    ),
  );

  for (let di = 0; di < dayKeys.length; di++) {
    const day = dayKeys[di];
    const group = grouped.get(day)!;

    // Separator between day groups
    if (di > 0) {
      console.log(chalk.dim(`  ${"".padEnd(18)}${"".padEnd(11)}${"".padEnd(12)}${"".padEnd(11)}${"- ".repeat(5)}`));
    }

    // Inter-day delta (between last entry of previous day and last entry of this day)
    let dailyDeltaStr = chalk.dim("\u2014");
    if (di > 0) {
      const prevLast = dailyLast.get(dayKeys[di - 1])!;
      const curLast = group[group.length - 1];
      const dd = curLast.spend - prevLast.spend;
      const sign = dd >= 0 ? "+" : "";
      dailyDeltaStr = (dd >= 0 ? chalk.red : chalk.green)(
        `${sign}$${dd.toFixed(2)}`,
      );
    }

    for (let i = 0; i < group.length; i++) {
      const e = group[i];
      const d = new Date(e.timestamp);
      const dateStr = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const spendStr = `$${e.spend.toFixed(2)}`;
      const remainStr =
        e.maxBudget != null
          ? `$${(e.maxBudget - e.spend).toFixed(2)}`
          : "N/A";

      // Intra-day delta (between consecutive records within the same day)
      let deltaStr = chalk.dim("\u2014");
      if (i > 0) {
        const delta = e.spend - group[i - 1].spend;
        const sign = delta >= 0 ? "+" : "";
        deltaStr = (delta >= 0 ? chalk.red : chalk.green)(
          `${sign}$${delta.toFixed(2)}`,
        );
      }

      // Show daily delta only on last row of each day group
      const dailyCol = i === group.length - 1 ? dailyDeltaStr : "";

      console.log(
        `  ${dateStr.padEnd(18)}${padColored(chalk.yellow(spendStr), 11)}${padColored(chalk.green(remainStr), 12)}${padColored(deltaStr, 11)}${dailyCol}`,
      );
    }
  }

  console.log(chalk.dim(`  ${sep}`));

  // Summary
  if (daily.length >= 2) {
    const first = daily[0];
    const last = daily[daily.length - 1];
    const daysDiff =
      (new Date(last.timestamp).getTime() -
        new Date(first.timestamp).getTime()) /
      (1000 * 60 * 60 * 24);
    const dailyAvg = daysDiff > 0 ? (last.spend - first.spend) / daysDiff : 0;

    console.log(
      `  Daily avg: ${chalk.cyan(`$${dailyAvg.toFixed(2)}/day`)}`,
    );
  } else {
    console.log(chalk.dim("  Not enough data for trends"));
  }

  // Chart uses daily last values (only with 3+ days)
  if (daily.length >= 3) {
    renderChart(daily);
  }

  console.log("");
}

function renderChart(entries: UsageEntry[]): void {
  // Compute daily deltas (skip first entry — no previous day)
  const deltas: { delta: number; entry: UsageEntry }[] = [];
  for (let i = 1; i < entries.length; i++) {
    deltas.push({
      delta: entries[i].spend - entries[i - 1].spend,
      entry: entries[i],
    });
  }
  if (deltas.length === 0) return;

  const values = deltas.map((d) => d.delta);
  const max = Math.max(...values);
  const min = Math.min(0, ...values); // floor at 0 for typical case
  const range = max - min || 1;
  const height = 8;
  const barW = 5; // match MM/DD label width
  const gap = 1;
  const step = barW + gap;

  console.log("");
  console.log(chalk.bold("  Daily Spend:"));
  console.log("");

  // Calculate bar heights (minimum 1 so every day is visible)
  const barHeights = values.map((v) =>
    Math.max(1, Math.round(((v - min) / range) * (height - 1)) + 1),
  );

  // Render rows top-to-bottom
  for (let row = 0; row < height; row++) {
    const threshold = height - row;
    const label =
      row === 0
        ? `$${max.toFixed(0)}`.padStart(6)
        : row === height - 1
          ? `$${min.toFixed(0)}`.padStart(6)
          : "      ";
    let line = "";
    for (let i = 0; i < deltas.length; i++) {
      const filled = barHeights[i] >= threshold;
      line += filled ? chalk.cyan("\u2588".repeat(barW)) : " ".repeat(barW);
      if (i < deltas.length - 1) line += " ".repeat(gap);
    }
    console.log(chalk.dim(`  ${label} `) + line);
  }

  // X-axis line
  const axisW = deltas.length * step - gap;
  console.log(chalk.dim(`         ${"─".repeat(axisW)}`));

  // Date labels aligned under each bar
  let labelLine = "         ";
  for (let i = 0; i < deltas.length; i++) {
    const d = new Date(deltas[i].entry.timestamp);
    const lbl = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    if (i > 0) labelLine += " ".repeat(gap);
    labelLine += lbl.padEnd(barW);
  }
  console.log(chalk.dim(labelLine));
}
