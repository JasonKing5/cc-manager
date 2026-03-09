# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@codefe/cc-manager` (`ccm`) is a Node.js CLI tool that manages multiple named provider configurations for `claude-code` connecting to various providers (AWS Bedrock, Google Vertex AI, LiteLLM proxies, DeepSeek, OpenRouter, Kimi, Zhipu/z.ai, Ollama, Qwen). It manages `~/.claude/ccm.json` (multi-config store) and `~/.claude/settings.json` with 14 commands: `add` (create config), `list` (show all), `use` (switch active, `--previous`, `--launch`), `edit` (modify config, including fast model), `remove` (delete config), `model` (select model from active config), `usage` (balance/quota query), `status` (current config overview, `--json`/`--short`), `doctor` (config diagnostics, `--test-api`), `clone` (duplicate config), `export` (export to JSON), `import` (import from JSON), `snapshot` (save current settings as config), `completion` (shell completions for bash/zsh/fish).

## Build & Run

```bash
pnpm build          # compile TypeScript → dist/
pnpm dev            # compile in watch mode
pnpm start          # run dist/index.js directly
pnpm link --global  # make `ccm` available globally
```

No test framework is configured yet.

## Architecture

- **ESM-only project** — `"type": "module"` in package.json, chalk v5 requires it. All internal imports must use `.js` extensions (Node16 module resolution).
- **Entry point**: `src/index.ts` — commander program that registers 14 subcommands (add/list/use/edit/remove/model/usage/status/doctor/clone/export/import/snapshot/completion), each in its own file under `src/commands/`. Commands with options (use/status/doctor/export/completion) use a `registerXxxCommand(program)` pattern to attach options at registration time.
- **Store layer**: `src/lib/store.ts` — read/write `~/.claude/ccm.json` (multi-config store). Exports `readStore()`, `writeStore()`, `applyToSettings()` (clears ccm-managed keys then merges provider env), `clearSettings()`. Validates JSON shape on read. Store includes `previousActive` field for `use --previous` support.
- **Settings layer**: `src/lib/settings.ts` — read/write `~/.claude/settings.json`. Preserves unknown fields the user may have set. Auto-backs up to `settings.json.bak` before every write.
- **Provider templates**: `src/lib/providers.ts` — `PROVIDER_TEMPLATES` array with 9 templates (LiteLLM, Bedrock, Vertex, DeepSeek, OpenRouter, Kimi, Zhipu, Ollama, Qwen). Each template defines env fields with support for fixed values, secrets, defaults, and required flags. Each template may include its own curated model group. `CCM_ENV_KEYS` in store.ts is dynamically derived from all template fields.
- **Model data**: `src/lib/models.ts` — `MODEL_GROUPS` array of 42 models across 5 vendor groups (global list used for Bedrock/Vertex/manual configs). Exports `buildCheckboxChoices()` for add/edit and `buildSelectChoices()` for model selection.
- **Prompt helpers**: `src/lib/prompts.ts` — `styledConfirm()` for styled yes/no prompts, `buildConfigChoices()` for rich config selection (used by use/edit/remove/clone/export commands, shows provider name, URL/region, model count per config).
- **Settings type**: `Record<string, any>` — we don't own the settings.json schema, so we treat it as an opaque object and only touch the `env` key.
- **HTTP**: Native `fetch` (Node 18+), no axios/node-fetch dependency.
