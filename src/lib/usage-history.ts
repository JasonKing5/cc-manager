import chalk from "chalk";

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

function padColored(s: string, width: number): string {
  const visible = stripAnsi(s).length;
  return s + " ".repeat(Math.max(0, width - visible));
}

export interface SpendLogEntry {
  startTime: string; // "YYYY-MM-DD"
  spend: number;
  users: Record<string, number>;
  models: Record<string, number>;
}

export async function fetchSpendLogs(
  apiBase: string,
  token: string,
  keyHash: string,
  days: number,
): Promise<SpendLogEntry[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `${apiBase}/spend/logs?api_key=${encodeURIComponent(keyHash)}&start_date=${fmt(start)}&end_date=${fmt(end)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Unexpected response format");
  }

  return (data as SpendLogEntry[]).sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
}

export function displayHistorySummary(entries: SpendLogEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.yellow("  No spend data found for this period."));
    return;
  }

  const dailySpends = entries.map((e) => e.spend);

  // Chart with spend labels on top of bars
  renderChartImproved(
    entries.map((e) => e.startTime),
    dailySpends,
  );

  // Daily average
  if (entries.length >= 2) {
    const totalSpend = dailySpends.reduce((a, b) => a + b, 0);
    const dailyAvg = totalSpend / entries.length;
    console.log(`  Daily avg: ${chalk.cyan(`$${dailyAvg.toFixed(2)}/day`)}`);
  } else {
    console.log(chalk.dim("  Not enough data for trends"));
  }

  console.log("");
}

function simplifyModelName(name: string): string {
  // Strip common prefixes like "us.anthropic." or "us.amazon."
  let s = name.replace(/^[a-z]{2}\.[a-z]+\./, "");
  // Strip date-version suffixes like "-20251001-v1:0"
  s = s.replace(/-\d{8}(-v\d+)?(:\d+)?$/, "");
  return s;
}

export function displayHistory(entries: SpendLogEntry[]): void {
  if (entries.length === 0) return;

  const visibleEntries = entries.filter(
    (e) => e.spend > 0 || Object.values(e.models).some((v) => v > 0),
  );
  if (visibleEntries.length === 0) return;

  const sep = "─".repeat(50);
  console.log("");
  console.log(chalk.bold("  Model Breakdown"));
  console.log(chalk.dim(`  ${sep}`));

  for (let ei = 0; ei < visibleEntries.length; ei++) {
    const entry = visibleEntries[ei];
    const models = Object.entries(entry.models).filter(([, v]) => v > 0);
    models.sort((a, b) => b[1] - a[1]);

    // Day header with total
    const spendTotal = entry.spend > 0
      ? chalk.yellow(`$${entry.spend.toFixed(2)}`)
      : chalk.dim("$0.00");
    console.log(`  ${chalk.bold(entry.startTime)}  ${spendTotal}`);

    // Model rows
    for (const [model, spend] of models) {
      const modelName = simplifyModelName(model);
      const spendStr = chalk.dim(`$${spend.toFixed(2)}`);
      console.log(`    ${chalk.gray("├")} ${modelName.padEnd(30)}${spendStr}`);
    }

    // Spacing between days
    if (ei < visibleEntries.length - 1) {
      console.log("");
    }
  }

  console.log(chalk.dim(`  ${sep}`));
  console.log("");
}

function renderChartImproved(
  dates: string[],
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
  const barW = 7;
  const gap = 2;

  console.log("");
  console.log(chalk.bold("  Daily Spend:"));
  console.log("");

  // Bar heights scaled to rowCount
  const barHeights = values.map((v) =>
    v <= 0 ? 0 : Math.max(1, Math.round((v / chartMax) * rowCount)),
  );

  // Label row for each bar: one row above bar top
  const labelRows = barHeights.map((h) => (h > 0 ? rowCount - h - 1 : -1));

  // Build tick row map: tick value -> row index
  const tickRows = new Map<number, number>();
  for (const t of ticks) {
    if (t === 0) continue;
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

    // Y-axis tick mark
    const axisMark = tickVal != null ? "┤" : "│";

    // Build bar area with inline spend labels
    let line = "";
    for (let i = 0; i < values.length; i++) {
      const filled = barHeights[i] >= threshold;
      const isLabelRow = labelRows[i] === row;

      if (isLabelRow && values[i] > 0) {
        // Spend label just above the bar
        const lbl = `$${values[i].toFixed(2)}`;
        const pad = Math.max(0, barW - lbl.length);
        const padL = Math.floor(pad / 2);
        line += chalk.yellow(" ".repeat(padL) + lbl + " ".repeat(pad - padL));
      } else if (filled) {
        line += chalk.cyan("█".repeat(barW));
      } else if (tickVal != null) {
        line += chalk.dim.gray("┈".repeat(barW));
      } else {
        line += " ".repeat(barW);
      }

      if (i < values.length - 1) {
        line += tickVal != null ? chalk.dim.gray("┈".repeat(gap)) : " ".repeat(gap);
      }
    }

    console.log(chalk.dim(`  ${label} ${axisMark}`) + line);
  }

  // X-axis
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

  // Date labels (strip leading zeros)
  let labelLine = "          ";
  for (let i = 0; i < dates.length; i++) {
    const parts = dates[i].split("-");
    const lbl = `${Number(parts[1])}/${Number(parts[2])}`;
    if (i > 0) labelLine += " ".repeat(gap);
    labelLine += lbl.padEnd(barW);
  }
  console.log(chalk.dim(labelLine));
}
