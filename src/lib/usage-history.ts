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

export async function displayHistorySummary(
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

  // Group all entries by day
  const allGrouped = new Map<string, UsageEntry[]>();
  for (const e of entries) {
    const day = e.timestamp.slice(0, 10);
    const group = allGrouped.get(day);
    if (group) group.push(e);
    else allGrouped.set(day, [e]);
  }

  // Select last N days
  const allDayKeys = [...allGrouped.keys()];
  const selectedDayKeys = allDayKeys.slice(-limit);

  // Build daily-last list (last entry per day = end-of-day spend)
  const dailyLast: { day: string; entry: UsageEntry }[] = [];
  for (const day of selectedDayKeys) {
    const group = allGrouped.get(day)!;
    dailyLast.push({ day, entry: group[group.length - 1] });
  }

  // Compute daily deltas
  const dailySpends: number[] = [];
  for (let i = 0; i < dailyLast.length; i++) {
    if (i === 0) {
      const group = allGrouped.get(dailyLast[i].day)!;
      if (group.length > 1) {
        dailySpends.push(group[group.length - 1].spend - group[0].spend);
      } else {
        dailySpends.push(0);
      }
    } else {
      dailySpends.push(
        dailyLast[i].entry.spend - dailyLast[i - 1].entry.spend,
      );
    }
  }

  // Simplified table: one row per day
  const sep = "─".repeat(30);
  console.log("");
  console.log(chalk.bold("  Daily Usage"));
  console.log(chalk.dim(`  ${sep}`));
  console.log(chalk.dim(`  ${"Date".padEnd(14)}Daily Spend`));

  for (let i = 0; i < dailyLast.length; i++) {
    const day = dailyLast[i].day;
    const spend = dailySpends[i];
    const spendStr =
      spend > 0
        ? chalk.red(`+$${spend.toFixed(2)}`)
        : spend < 0
          ? chalk.green(`-$${Math.abs(spend).toFixed(2)}`)
          : chalk.dim("$0.00");
    console.log(`  ${day.padEnd(14)}${spendStr}`);
  }

  console.log(chalk.dim(`  ${sep}`));

  // Daily average
  if (dailyLast.length >= 2) {
    const first = dailyLast[0].entry;
    const last = dailyLast[dailyLast.length - 1].entry;
    const daysDiff =
      (new Date(last.timestamp).getTime() -
        new Date(first.timestamp).getTime()) /
      (1000 * 60 * 60 * 24);
    const dailyAvg = daysDiff > 0 ? (last.spend - first.spend) / daysDiff : 0;
    console.log(`  Daily avg: ${chalk.cyan(`$${dailyAvg.toFixed(2)}/day`)}`);
  } else {
    console.log(chalk.dim("  Not enough data for trends"));
  }

  // Chart (require 3+ days)
  if (dailyLast.length >= 3) {
    renderChartImproved(
      dailyLast.map((d) => d.entry),
      dailySpends,
    );
  }

  console.log("");
}

export async function displayHistory(
  configName: string,
  limit: number,
): Promise<void> {
  const history = await readHistory();
  const entries = history[configName];

  if (!entries || entries.length === 0) return;

  // Limit applies to days, not raw entries
  const allGrouped = new Map<string, UsageEntry[]>();
  for (const e of entries) {
    const day = e.timestamp.slice(0, 10);
    const group = allGrouped.get(day);
    if (group) group.push(e);
    else allGrouped.set(day, [e]);
  }
  const allDayKeys = [...allGrouped.keys()];
  const selectedDays = new Set(allDayKeys.slice(-limit));
  const shown = entries.filter((e) => selectedDays.has(e.timestamp.slice(0, 10)));

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

  // Table
  const sep = "─".repeat(62);
  console.log("");
  console.log(chalk.bold(`  Detailed History (${configName})`));
  console.log(chalk.dim(`  ${sep}`));
  console.log(
    chalk.dim(
      `  ${"Date".padEnd(18)}${"Spent".padEnd(11)}${"Remaining".padEnd(12)}${"Delta".padEnd(11)}Daily`,
    ),
  );

  for (let di = 0; di < dayKeys.length; di++) {
    const day = dayKeys[di];
    const group = grouped.get(day)!;

    if (di > 0) {
      console.log(chalk.dim(`  ${"".padEnd(18)}${"".padEnd(11)}${"".padEnd(12)}${"".padEnd(11)}${"- ".repeat(5)}`));
    }

    let dailyDelta: number | null = null;
    if (di > 0) {
      const prevLast = dailyLast.get(dayKeys[di - 1])!;
      dailyDelta = group[group.length - 1].spend - prevLast.spend;
    } else if (group.length > 1) {
      dailyDelta = group[group.length - 1].spend - group[0].spend;
    }
    let dailyDeltaStr = chalk.dim("—");
    if (dailyDelta != null) {
      const sign = dailyDelta >= 0 ? "+" : "";
      dailyDeltaStr = (dailyDelta >= 0 ? chalk.red : chalk.green)(
        `${sign}$${dailyDelta.toFixed(2)}`,
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

      let deltaStr = chalk.dim("—");
      if (i > 0) {
        const delta = e.spend - group[i - 1].spend;
        const sign = delta >= 0 ? "+" : "";
        deltaStr = (delta >= 0 ? chalk.red : chalk.green)(
          `${sign}$${delta.toFixed(2)}`,
        );
      }

      const dailyCol = i === group.length - 1 ? dailyDeltaStr : "";

      console.log(
        `  ${dateStr.padEnd(18)}${padColored(chalk.yellow(spendStr), 11)}${padColored(chalk.green(remainStr), 12)}${padColored(deltaStr, 11)}${dailyCol}`,
      );
    }
  }

  console.log(chalk.dim(`  ${sep}`));
  console.log("");
}

function renderChartImproved(
  entries: UsageEntry[],
  dailySpends: number[],
): void {
  const values = dailySpends;
  if (values.length === 0) return;

  const maxVal = Math.max(...values, 0) || 1;

  // Y-axis tick algorithm: ~5 ticks, minimum step of 0.5
  const rawStep = maxVal / 5;
  const step = Math.max(0.5, Math.ceil(rawStep * 2) / 2);
  const ticks: number[] = [];
  for (let i = 0; i * step <= maxVal || ticks.length < 2; i++) {
    ticks.push(i * step);
  }
  if (ticks[ticks.length - 1] < maxVal) {
    ticks.push(ticks[ticks.length - 1] + step);
  }
  const chartMax = ticks[ticks.length - 1];

  // Each tick interval gets 2 rows for more height
  const rowsPerTick = 2;
  const rowCount = Math.max(6, (ticks.length - 1) * rowsPerTick);
  const barW = 5;
  const gap = 1;
  const chartW = values.length * (barW + gap) - gap;

  // Dashed line filling the chart width (subtle)
  const dash = "┈".repeat(chartW);

  console.log("");
  console.log(chalk.bold("  Daily Spend:"));
  console.log("");

  // Bar heights scaled to rowCount
  const barHeights = values.map((v) =>
    v <= 0 ? 0 : Math.max(1, Math.round((v / chartMax) * rowCount)),
  );

  // Build tick row map: tick value -> row index
  const tickRows = new Map<number, number>();
  for (const t of ticks) {
    if (t === 0) continue; // 0 is at the X-axis
    const row = rowCount - Math.round((t / chartMax) * rowCount);
    tickRows.set(row, t);
  }

  // Render rows top-to-bottom
  for (let row = 0; row < rowCount; row++) {
    const threshold = rowCount - row;
    const tickVal = tickRows.get(row);

    // Y-axis label
    const label =
      tickVal != null
        ? `$${tickVal.toFixed(1)}`.padStart(6)
        : "      ";

    // Y-axis tick mark: ┤ at tick rows, │ otherwise
    const axisMark = tickVal != null ? "┤" : "│";

    // Build bar area
    let line = "";
    for (let i = 0; i < values.length; i++) {
      const filled = barHeights[i] >= threshold;
      line += filled ? chalk.cyan("█".repeat(barW)) : " ".repeat(barW);
      if (i < values.length - 1) line += " ".repeat(gap);
    }

    // Overlay dashed grid line at tick rows (behind bars)
    if (tickVal != null) {
      let gridLine = "";
      for (let i = 0; i < values.length; i++) {
        const filled = barHeights[i] >= threshold;
        if (filled) {
          gridLine += chalk.cyan("█".repeat(barW));
        } else {
          gridLine += chalk.dim.gray("┈".repeat(barW));
        }
        if (i < values.length - 1) {
          gridLine += chalk.dim.gray("┈".repeat(gap));
        }
      }
      console.log(chalk.dim(`  ${label} ${axisMark}`) + gridLine);
    } else {
      console.log(chalk.dim(`  ${label} ${axisMark}`) + line);
    }
  }

  // X-axis: $0.0 label + corner + horizontal line (with ▄ under bars to close gap)
  let axisLine = "";
  for (let i = 0; i < values.length; i++) {
    if (barHeights[i] >= 1) {
      axisLine += chalk.cyan("▀".repeat(barW));
    } else {
      axisLine += chalk.dim("─".repeat(barW));
    }
    if (i < values.length - 1) {
      axisLine += chalk.dim("─".repeat(gap));
    }
  }
  console.log(chalk.dim(`  ${"$0.0".padStart(6)} └`) + axisLine);

  // Date labels (offset by Y-axis width: 6 label + 1 space + 1 axis char = 8, plus 2 indent)
  let labelLine = "          ";
  for (let i = 0; i < entries.length; i++) {
    const d = new Date(entries[i].timestamp);
    const lbl = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    if (i > 0) labelLine += " ".repeat(gap);
    labelLine += lbl.padEnd(barW);
  }
  console.log(chalk.dim(labelLine));
}

