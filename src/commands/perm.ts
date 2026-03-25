import { checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import type { Command } from "commander";
import { readSettings } from "../lib/settings.js";
import {
  readLocalSettings,
  writeLocalSettings,
  GLOBAL_LOCAL_PATH,
  projectLocalPath,
} from "../lib/settings.js";
import { numberedSelect, styledConfirm } from "../lib/prompts.js";
import {
  PERMISSION_TEMPLATES,
  KNOWN_PLUGINS,
  categorizePermissions,
  auditPermissions,
  generateCleanSuggestions,
  type CategorizedPermissions,
  type AuditFinding,
} from "../lib/permissions.js";

export function registerPermCommand(program: Command): void {
  const perm = program
    .command("perm")
    .description("Permission management (init, ls, audit, clean)");

  perm
    .command("init")
    .description("Initialize project permissions from template")
    .action(permInitCommand);

  perm
    .command("ls")
    .alias("list")
    .description("List permissions by scope and category")
    .action(permLsCommand);

  perm
    .command("audit")
    .description("Audit permissions for redundancy and issues")
    .action(permAuditCommand);

  perm
    .command("clean")
    .description("Clean up and merge redundant permissions")
    .action(permCleanCommand);
}

// ─── perm init ───────────────────────────────────────────────

async function permInitCommand(): Promise<void> {
  const localPath = projectLocalPath();
  const existing = await readLocalSettings(localPath);
  const existingPerms: string[] = existing.permissions?.allow ?? [];

  if (existingPerms.length > 0) {
    console.log(
      chalk.yellow(`Project already has ${existingPerms.length} permission(s).`),
    );
    const merge = await styledConfirm("Merge new permissions into existing?");
    if (!merge) return;
  }

  // 1. Select project template
  const templateKey = await numberedSelect<string>({
    message: "Select project type",
    choices: Object.keys(PERMISSION_TEMPLATES).map((k) => ({
      name: k,
      value: k,
    })),
  });

  // Collect permissions: chosen template + Generic (always included)
  const permSet = new Set<string>(existingPerms);
  for (const p of PERMISSION_TEMPLATES[templateKey]) permSet.add(p);
  if (templateKey !== "Generic") {
    for (const p of PERMISSION_TEMPLATES["Generic"]) permSet.add(p);
  }

  // 2. Select MCP plugins to activate
  const settings = await readSettings();
  const enabledPlugins: Record<string, boolean> = settings.enabledPlugins ?? {};
  const activePlugins = KNOWN_PLUGINS.filter((p) => enabledPlugins[p.id] === true);

  if (activePlugins.length > 0) {
    const selectedPlugins = await checkbox({
      message: "Activate MCP permissions for which plugins?",
      choices: activePlugins.map((p) => ({
        name: p.name,
        value: p.mcpPrefix,
        checked: true,
      })),
    });
    for (const prefix of selectedPlugins) {
      permSet.add(`${prefix}*`);
    }
  }

  // 3. Inherit global user permissions
  const globalLocal = await readLocalSettings(GLOBAL_LOCAL_PATH);
  const globalPerms: string[] = globalLocal.permissions?.allow ?? [];
  if (globalPerms.length > 0) {
    const inherit = await styledConfirm(
      `Inherit ${globalPerms.length} global user permission(s) into this project? (recommended)`,
    );
    if (inherit) {
      for (const p of globalPerms) permSet.add(p);
    }
  }

  // 4. Write
  const finalPerms = [...permSet];
  existing.permissions = { ...existing.permissions, allow: finalPerms };
  await writeLocalSettings(localPath, existing);

  const added = finalPerms.length - existingPerms.length;
  console.log(
    chalk.green(
      `\nWrote ${finalPerms.length} permission(s) to ${chalk.dim(localPath)}` +
        (added > 0 ? ` (${added} new)` : ""),
    ),
  );
}

// ─── perm ls ─────────────────────────────────────────────────

async function permLsCommand(): Promise<void> {
  const globalLocal = await readLocalSettings(GLOBAL_LOCAL_PATH);
  const projectLocal = await readLocalSettings(projectLocalPath());

  const globalPerms: string[] = globalLocal.permissions?.allow ?? [];
  const projectPerms: string[] = projectLocal.permissions?.allow ?? [];

  if (globalPerms.length === 0 && projectPerms.length === 0) {
    console.log(chalk.yellow("No permissions found."));
    return;
  }

  if (globalPerms.length > 0) {
    console.log(chalk.bold.cyan("\n  Global User Permissions") + chalk.dim(` (${GLOBAL_LOCAL_PATH})`));
    displayCategorized(categorizePermissions(globalPerms), globalPerms.length);
  }

  if (projectPerms.length > 0) {
    console.log(chalk.bold.cyan("\n  Project Permissions") + chalk.dim(` (${projectLocalPath()})`));
    displayCategorized(categorizePermissions(projectPerms), projectPerms.length);
  }

  console.log();
}

// ─── perm audit ──────────────────────────────────────────────

async function permAuditCommand(): Promise<void> {
  await permLsCommand();

  const globalLocal = await readLocalSettings(GLOBAL_LOCAL_PATH);
  const projectLocal = await readLocalSettings(projectLocalPath());
  const allPerms: string[] = [
    ...(globalLocal.permissions?.allow ?? []),
    ...(projectLocal.permissions?.allow ?? []),
  ];

  const findings = auditPermissions(allPerms);
  if (findings.length === 0) {
    console.log(chalk.green("  No issues found. Permissions look clean!"));
    return;
  }

  console.log(chalk.bold.yellow(`  Found ${findings.length} issue(s):\n`));
  displayFindings(findings);
  console.log(
    chalk.dim(`\n  Run ${chalk.bold("ccm perm clean")} to clean up.\n`),
  );
}

// ─── perm clean ──────────────────────────────────────────────

async function permCleanCommand(): Promise<void> {
  const scope = await numberedSelect<string>({
    message: "Which scope to clean?",
    choices: [
      { name: `Global  ${chalk.dim(GLOBAL_LOCAL_PATH)}`, value: "global" },
      { name: `Project ${chalk.dim(projectLocalPath())}`, value: "project" },
    ],
  });

  const filePath = scope === "global" ? GLOBAL_LOCAL_PATH : projectLocalPath();
  const data = await readLocalSettings(filePath);
  const perms: string[] = data.permissions?.allow ?? [];

  if (perms.length === 0) {
    console.log(chalk.yellow("No permissions found in this scope."));
    return;
  }

  const suggestions = generateCleanSuggestions(perms);

  if (suggestions.length === 0) {
    console.log(chalk.green("Permissions look clean! No suggestions."));
    return;
  }

  console.log(chalk.bold(`\nFound ${suggestions.length} suggestion(s):\n`));

  const selected = await checkbox({
    message: "Select changes to apply",
    choices: suggestions.map((s, i) => ({
      name: formatSuggestion(s),
      value: i,
      checked: true,
    })),
  });

  if (selected.length === 0) {
    console.log(chalk.dim("No changes selected."));
    return;
  }

  const confirm = await styledConfirm(
    `Apply ${selected.length} change(s)? (backup will be created)`,
  );
  if (!confirm) return;

  // Build new permissions array
  const toRemove = new Set<string>();
  const toAdd: string[] = [];
  for (const idx of selected) {
    const s = suggestions[idx];
    for (const a of s.affected) toRemove.add(a);
    if (s.replacement) toAdd.push(s.replacement);
  }

  const newPerms = perms.filter((p) => !toRemove.has(p));
  for (const a of toAdd) {
    if (!newPerms.includes(a)) newPerms.push(a);
  }

  data.permissions = { ...data.permissions, allow: newPerms };
  await writeLocalSettings(filePath, data);

  console.log(
    chalk.green(
      `\nDone: removed ${toRemove.size}, added ${toAdd.length}. ` +
        `${newPerms.length} permission(s) remaining.`,
    ),
  );
}

// ─── Display Helpers ─────────────────────────────────────────

function displayCategorized(cat: CategorizedPermissions, total: number): void {
  console.log(chalk.dim(`  Total: ${total}\n`));

  // Web
  if (cat.web.length > 0) {
    console.log(`  ${chalk.bold("Web Access")}`);
    for (const p of cat.web) {
      if (p.type === "WebSearch") {
        console.log(`    WebSearch`);
      } else {
        console.log(`    ${chalk.dim(p.domain ?? p.raw)}`);
      }
    }
    console.log();
  }

  // MCP
  if (cat.mcp.size > 0) {
    console.log(`  ${chalk.bold("Plugins & MCP")}`);
    for (const [plugin, perms] of cat.mcp) {
      const methods = perms.map((p) => p.method).filter(Boolean);
      const hasWildcard = perms.some((p) => p.isWildcard);
      if (hasWildcard) {
        console.log(`    ${plugin} ${chalk.dim("(all methods)")}`);
      } else {
        console.log(`    ${plugin} ${chalk.dim(`(${methods.length} method${methods.length !== 1 ? "s" : ""})`)}`);
      }
    }
    console.log();
  }

  // Bash
  if (cat.bash.size > 0) {
    console.log(`  ${chalk.bold("Terminal Commands")}`);
    for (const [cmd, perms] of cat.bash) {
      const hasWildcard = perms.some((p) => p.isWildcard);
      if (hasWildcard) {
        console.log(`    ${cmd} ${chalk.dim("(*)")}`);
      } else {
        const subs = perms
          .map((p) => p.subCommand?.split(/\s/)[0])
          .filter(Boolean);
        if (subs.length > 0) {
          console.log(`    ${cmd}: ${chalk.dim(subs.join(", "))}`);
        } else {
          console.log(`    ${cmd} ${chalk.dim(`(${perms.length})`)}`);
        }
      }
    }
    console.log();
  }

  // Unknown
  if (cat.unknown.length > 0) {
    console.log(`  ${chalk.bold("Other")}`);
    for (const p of cat.unknown) {
      console.log(`    ${chalk.dim(p.raw)}`);
    }
    console.log();
  }
}

function displayFindings(findings: AuditFinding[]): void {
  const byReason = new Map<string, AuditFinding[]>();
  for (const f of findings) {
    const arr = byReason.get(f.reason) ?? [];
    arr.push(f);
    byReason.set(f.reason, arr);
  }

  const labels: Record<string, string> = {
    hardcoded_path: "Hardcoded user paths",
    temp_dir: "Temporary directory references",
    long_no_wildcard: "Long commands without wildcard",
    redundant: "Redundant commands (can be merged)",
  };

  for (const [reason, items] of byReason) {
    console.log(`  ${chalk.yellow(`  ${labels[reason] ?? reason}`)} ${chalk.dim(`(${items.length})`)}`);
    for (const f of items.slice(0, 5)) {
      const raw =
        f.permission.raw.length > 70
          ? f.permission.raw.slice(0, 67) + "..."
          : f.permission.raw;
      const sug = f.suggestion ? chalk.dim(` -> ${f.suggestion}`) : "";
      console.log(`      ${chalk.dim(raw)}${sug}`);
    }
    if (items.length > 5) {
      console.log(chalk.dim(`      ... and ${items.length - 5} more`));
    }
  }
}

function formatSuggestion(s: CleanSuggestion): string {
  switch (s.type) {
    case "merge":
      return `${chalk.cyan("MERGE")}  ${s.description}`;
    case "garbage_remove":
      return `${chalk.red("REMOVE")} ${s.description}`;
    case "wildcard_convert":
      return `${chalk.yellow("CONVERT")} ${s.description}`;
    default:
      return s.description;
  }
}

type CleanSuggestion = ReturnType<typeof generateCleanSuggestions>[number];
