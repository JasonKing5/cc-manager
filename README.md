# cc-manager (ccm)

A CLI tool to manage multiple provider configurations for [claude code](https://docs.anthropic.com/en/docs/claude-code) — switch providers, models, and permissions instantly.

**Supported providers:** AWS Bedrock · Google Vertex AI · LiteLLM · DeepSeek · OpenRouter · Kimi · Zhipu · Ollama · Qwen · SiliconFlow · Azure AI Foundry

## Install

```bash
npm install -g @codefe/cc-manager
# or
pnpm add -g @codefe/cc-manager
```

Requires **Node.js >= 18**.

## Quick Start

```bash
ccm add          # create a provider configuration
ccm use          # switch active configuration
ccm model        # pick a model
ccm usage        # check balance & today's spend
ccm status       # show what's active
```

## Core Commands

### Configuration

| Command | Description |
|---------|-------------|
| `ccm add` | Create a new provider config (interactive wizard) |
| `ccm list` | List all configs with provider, URL, model count |
| `ccm use [name]` | Switch active config; syncs `settings.json` |
| `ccm use -p` | Switch back to the previous config (like `cd -`) |
| `ccm use <name> -l` | Switch and immediately launch `claude` |
| `ccm edit [name]` | Edit env vars, models, or fast model |
| `ccm remove [name]` | Remove a config |
| `ccm model` | Select a model from the active config |

### Utilities

| Command | Description |
|---------|-------------|
| `ccm status` | Show active config name, provider, model |
| `ccm status --short` | One-liner for shell prompts / PS1 |
| `ccm status --json` | JSON output for scripting |
| `ccm usage` | Balance, budget, expiry + auto daily spend tracking |
| `ccm usage -H` | Show spend history (last 7 days) |
| `ccm usage -H -v` | History with per-model breakdown |
| `ccm doctor` | Diagnose config issues, check settings sync |
| `ccm doctor --test-api` | Also test API connectivity |

### Permissions & Plugins

| Command | Description |
|---------|-------------|
| `ccm perm init` | Initialize permissions from template |
| `ccm perm ls` | List permissions by scope and category |
| `ccm perm audit` | Detect redundant or problematic permissions |
| `ccm perm clean` | Merge and clean up redundant permissions |
| `ccm plugin` | Toggle MCP plugins on/off (auto-adds permissions) |
| `ccm mode` | Switch between `plan` / `act` execution mode |

### Transfer

| Command | Description |
|---------|-------------|
| `ccm clone [src] [name]` | Deep-clone a config |
| `ccm export [-o file]` | Export configs to JSON (supports `--mask-secrets`) |
| `ccm import <file>` | Import configs; handles name conflicts interactively |
| `ccm snapshot [name]` | Save current `settings.json` state as a config |

### Shell

```bash
# Tab completion
eval "$(ccm completion zsh)"   # or bash / fish
```

## Highlights

**Instant provider switching** — `ccm use` rewrites only the `env` block in `settings.json`, clearing stale keys from the previous provider. Switch in under a second.

**Daily spend tracking** — `ccm usage` auto-initializes a daily baseline on first run. Every subsequent call that day shows today's incremental spend alongside total balance.

**Fast model support** — set a separate `ANTHROPIC_SMALL_FAST_MODEL` per config for parallel/background tasks via `ccm edit → Set fast model`.

**Shell prompt integration** — embed the active config in your terminal prompt:
```bash
# In ~/.zshrc
PS1='$(ccm status --short) $ '
# → my-deepseek | DeepSeek | deepseek-chat $
```

**Permission management** — `ccm perm` manages Claude Code's `allowedTools` / `deniedTools` at both global and project scope, with templates, auditing, and MCP wildcard generation.

## How It Works

ccm manages two files:

- **`~/.claude/ccm.json`** — all named configs (env vars, model list, active, previous)
- **`~/.claude/settings.json`** — read by claude-code; ccm only touches the `env` key, preserves everything else, and auto-backs up to `settings.json.bak` before every write

## License

[MIT](LICENSE)
