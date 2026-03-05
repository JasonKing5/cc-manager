# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@codefe/cc-manager` (`ccm`) is a Node.js CLI tool that manages multiple named provider configurations for `claude-code` connecting to various providers (AWS Bedrock, Google Vertex AI, LiteLLM proxies, DeepSeek). It manages `~/.claude/ccm.json` (multi-config store) and `~/.claude/settings.json` with seven commands: `add` (create config), `list` (show all), `use` (switch active), `edit` (modify config), `remove` (delete config), `model` (select model from active config), `usage` (balance/quota query).

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
- **Entry point**: `src/index.ts` — commander program that registers seven subcommands (add/list/use/edit/remove/model/usage), each in its own file under `src/commands/`.
- **Store layer**: `src/lib/store.ts` — read/write `~/.claude/ccm.json` (multi-config store). Exports `readStore()`, `writeStore()`, `applyToSettings()` (clears ccm-managed keys then merges provider env), `clearSettings()`. Validates JSON shape on read.
- **Settings layer**: `src/lib/settings.ts` — read/write `~/.claude/settings.json`. Preserves unknown fields the user may have set.
- **Provider templates**: `src/lib/providers.ts` — `PROVIDER_TEMPLATES` array with 4 templates (LiteLLM, Bedrock, Vertex, DeepSeek). Each template defines env fields with support for fixed values, secrets, defaults, and required flags. `CCM_ENV_KEYS` in store.ts is dynamically derived from all template fields.
- **Model data**: `src/lib/models.ts` — `MODEL_GROUPS` array of 42 models across 5 vendor groups. Exports `buildCheckboxChoices()` for add/edit and `buildSelectChoices()` for model selection.
- **Prompt helpers**: `src/lib/prompts.ts` — `styledConfirm()` for styled yes/no prompts, `buildConfigChoices()` for rich config selection (used by use/edit/remove commands, shows provider name, URL/region, model count per config).
- **Settings type**: `Record<string, any>` — we don't own the settings.json schema, so we treat it as an opaque object and only touch the `env` key.
- **HTTP**: Native `fetch` (Node 18+), no axios/node-fetch dependency.
