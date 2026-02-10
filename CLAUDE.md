# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@codefe/cc-manager` (`ccm`) is a Node.js CLI tool that configures `claude-code` to connect to Bedrock/LiteLLM proxy services. It manages `~/.claude/settings.json` with three commands: `login` (API key setup), `model` (interactive model selection), `usage` (balance/quota query via LiteLLM API).

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
- **Entry point**: `src/index.ts` — commander program that registers three subcommands, each in its own file under `src/commands/`.
- **Settings layer**: `src/lib/settings.ts` — read/write `~/.claude/settings.json`. Uses spread-merge (`{ ...existing.env, ...newDefaults }`) to preserve unknown env vars the user may have set.
- **Model data**: `src/lib/models.ts` — static array of 24 model choices with `@inquirer/prompts` `Separator` instances for vendor grouping (Anthropic, OpenAI, Google, Amazon & Others).
- **Settings type**: `Record<string, any>` — we don't own the settings.json schema, so we treat it as an opaque object and only touch the `env` key.
- **HTTP**: Native `fetch` (Node 18+), no axios/node-fetch dependency.
