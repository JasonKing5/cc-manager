// Permission parsing, categorization, audit, and cleanup logic

export interface ParsedPermission {
  raw: string;
  type: "Bash" | "WebFetch" | "WebSearch" | "MCP" | "Unknown";
  baseCommand?: string;
  subCommand?: string;
  domain?: string;
  pluginName?: string;
  method?: string;
  isWildcard: boolean;
  isHardcoded: boolean;
}

const HARDCODED_PATH_RE = /\/Users\/|\/home\/|\/private\/tmp\/|\/tmp\//;
const PIPE_RE = /\s\|\s/;

export function parsePermission(raw: string): ParsedPermission {
  // Bash(command args:*)
  if (raw.startsWith("Bash(") && raw.endsWith(")")) {
    const inner = raw.slice(5, -1);
    const isWildcard = inner.endsWith(":*") || inner.includes("*");
    const isHardcoded =
      HARDCODED_PATH_RE.test(inner) || PIPE_RE.test(inner);

    const spaceIdx = inner.indexOf(" ");
    let baseCommand: string;
    let subCommand: string | undefined;
    if (spaceIdx === -1) {
      baseCommand = inner.replace(/:?\*$/, "");
    } else {
      baseCommand = inner.slice(0, spaceIdx);
      subCommand = inner.slice(spaceIdx + 1).replace(/:?\*$/, "").trim() || undefined;
    }

    return { raw, type: "Bash", baseCommand, subCommand, isWildcard, isHardcoded };
  }

  // WebFetch(domain:xxx) or WebFetch(url)
  if (raw.startsWith("WebFetch(") && raw.endsWith(")")) {
    const inner = raw.slice(9, -1);
    const domain = inner.startsWith("domain:") ? inner.slice(7) : inner;
    return { raw, type: "WebFetch", domain, isWildcard: inner.includes("*"), isHardcoded: false };
  }

  // WebSearch
  if (raw === "WebSearch") {
    return { raw, type: "WebSearch", isWildcard: false, isHardcoded: false };
  }

  // mcp__pluginname__method
  if (raw.startsWith("mcp__")) {
    const parts = raw.split("__");
    const pluginName = parts[1];
    const method = parts.slice(2).join("__") || undefined;
    const isWildcard = raw.includes("*");
    return { raw, type: "MCP", pluginName, method, isWildcard, isHardcoded: false };
  }

  return { raw, type: "Unknown", isWildcard: raw.includes("*"), isHardcoded: false };
}

// --- Categorization ---

export interface CategorizedPermissions {
  web: ParsedPermission[];
  mcp: Map<string, ParsedPermission[]>;
  bash: Map<string, ParsedPermission[]>;
  unknown: ParsedPermission[];
}

export function categorizePermissions(perms: string[]): CategorizedPermissions {
  const result: CategorizedPermissions = {
    web: [],
    mcp: new Map(),
    bash: new Map(),
    unknown: [],
  };

  for (const raw of perms) {
    const p = parsePermission(raw);
    switch (p.type) {
      case "WebFetch":
      case "WebSearch":
        result.web.push(p);
        break;
      case "MCP": {
        const key = p.pluginName ?? "unknown";
        const arr = result.mcp.get(key) ?? [];
        arr.push(p);
        result.mcp.set(key, arr);
        break;
      }
      case "Bash": {
        const key = p.baseCommand ?? "unknown";
        const arr = result.bash.get(key) ?? [];
        arr.push(p);
        result.bash.set(key, arr);
        break;
      }
      default:
        result.unknown.push(p);
    }
  }

  return result;
}

// --- Audit ---

export interface AuditFinding {
  permission: ParsedPermission;
  reason: "hardcoded_path" | "temp_dir" | "long_no_wildcard" | "redundant";
  suggestion?: string;
}

export function auditPermissions(perms: string[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const parsed = perms.map(parsePermission);

  // Group bash perms by base command for redundancy detection
  const bashGroups = new Map<string, ParsedPermission[]>();

  for (const p of parsed) {
    if (p.isHardcoded && /\/Users\/|\/home\//.test(p.raw)) {
      findings.push({ permission: p, reason: "hardcoded_path" });
    }
    if (/\/tmp\/|\/private\/tmp\//.test(p.raw)) {
      findings.push({ permission: p, reason: "temp_dir" });
    }
    if (p.type === "Bash" && !p.isWildcard && p.raw.length > 60) {
      findings.push({
        permission: p,
        reason: "long_no_wildcard",
        suggestion: p.baseCommand
          ? `Bash(${p.baseCommand}:*)`
          : undefined,
      });
    }
    if (p.type === "Bash" && p.baseCommand) {
      const arr = bashGroups.get(p.baseCommand) ?? [];
      arr.push(p);
      bashGroups.set(p.baseCommand, arr);
    }
  }

  // Redundancy: 3+ bash perms with same base command and no wildcard entry
  for (const [base, group] of bashGroups) {
    const hasWildcard = group.some((p) => p.isWildcard);
    if (!hasWildcard && group.length >= 3) {
      for (const p of group) {
        // Avoid duplicate findings
        if (!findings.some((f) => f.permission.raw === p.raw)) {
          findings.push({
            permission: p,
            reason: "redundant",
            suggestion: `Bash(${base}:*)`,
          });
        }
      }
    }
  }

  return findings;
}

// --- Clean Suggestions ---

export interface CleanSuggestion {
  type: "wildcard_convert" | "garbage_remove" | "merge";
  affected: string[];
  replacement?: string;
  description: string;
}

export function generateCleanSuggestions(perms: string[]): CleanSuggestion[] {
  const suggestions: CleanSuggestion[] = [];
  const parsed = perms.map((raw) => parsePermission(raw));

  // Group bash perms by base command
  const bashGroups = new Map<string, ParsedPermission[]>();
  for (const p of parsed) {
    if (p.type === "Bash" && p.baseCommand) {
      const arr = bashGroups.get(p.baseCommand) ?? [];
      arr.push(p);
      bashGroups.set(p.baseCommand, arr);
    }
  }

  // Merge suggestions: 3+ same base command without wildcard
  for (const [base, group] of bashGroups) {
    const hasWildcard = group.some((p) => p.isWildcard);
    if (!hasWildcard && group.length >= 3) {
      suggestions.push({
        type: "merge",
        affected: group.map((p) => p.raw),
        replacement: `Bash(${base}:*)`,
        description: `Merge ${group.length} "${base}" commands into Bash(${base}:*)`,
      });
    }
  }

  // Garbage: temp dirs, absolute paths
  const garbage = parsed.filter(
    (p) =>
      /\/private\/tmp\/|\/tmp\//.test(p.raw) ||
      (p.isHardcoded && /\/Users\/|\/home\//.test(p.raw)),
  );
  if (garbage.length > 0) {
    suggestions.push({
      type: "garbage_remove",
      affected: garbage.map((p) => p.raw),
      description: `Remove ${garbage.length} hardcoded/temp path permission(s)`,
    });
  }

  // Wildcard convert: individual long bash entries with subCommand
  for (const p of parsed) {
    if (
      p.type === "Bash" &&
      !p.isWildcard &&
      p.subCommand &&
      p.raw.length > 40 &&
      p.baseCommand
    ) {
      // Skip if already covered by merge suggestion
      const alreadyMerged = suggestions.some(
        (s) => s.type === "merge" && s.affected.includes(p.raw),
      );
      if (!alreadyMerged) {
        // Extract first word of subCommand for a sensible wildcard
        const subBase = p.subCommand.split(/\s/)[0];
        suggestions.push({
          type: "wildcard_convert",
          affected: [p.raw],
          replacement: `Bash(${p.baseCommand} ${subBase}:*)`,
          description: `Convert to Bash(${p.baseCommand} ${subBase}:*)`,
        });
      }
    }
  }

  return suggestions;
}

// --- Permission Templates ---

export const PERMISSION_TEMPLATES: Record<string, string[]> = {
  "Node.js / Frontend": [
    "Bash(pnpm:*)",
    "Bash(npm:*)",
    "Bash(npx:*)",
    "Bash(node:*)",
    "Bash(tsc:*)",
    "Bash(biome:*)",
    "Bash(eslint:*)",
  ],
  Python: [
    "Bash(python:*)",
    "Bash(python3:*)",
    "Bash(pip:*)",
    "Bash(pip3:*)",
    "Bash(uv:*)",
    "Bash(poetry:*)",
    "Bash(pytest:*)",
    "Bash(ruff:*)",
  ],
  Generic: [
    "Bash(git:*)",
    "Bash(find:*)",
    "Bash(ls:*)",
    "Bash(cat:*)",
    "Bash(grep:*)",
    "Bash(echo:*)",
    "Bash(head:*)",
    "Bash(wc:*)",
    "mcp__ide__getDiagnostics",
  ],
};

// --- Known Plugins ---

export interface KnownPlugin {
  id: string;
  name: string;
  mcpPrefix: string;
}

export const KNOWN_PLUGINS: KnownPlugin[] = [
  { id: "playwright@claude-plugins-official", name: "Playwright", mcpPrefix: "mcp__playwright__" },
  { id: "frontend-design@claude-plugins-official", name: "Frontend Design", mcpPrefix: "mcp__frontend_design__" },
  { id: "supabase@claude-plugins-official", name: "Supabase", mcpPrefix: "mcp__supabase__" },
  { id: "chrome-devtools@anthropic", name: "Chrome DevTools", mcpPrefix: "mcp__chrome-devtools__" },
  { id: "context7@anthropic", name: "Context7", mcpPrefix: "mcp__context7__" },
];
