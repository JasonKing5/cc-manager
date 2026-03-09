# cc-manager (ccm)

A lightweight CLI tool to configure [claude-code](https://docs.anthropic.com/en/docs/claude-code) for multiple providers (AWS Bedrock, Google Vertex AI, LiteLLM proxies, DeepSeek, OpenRouter, Kimi, Zhipu/z.ai, Ollama, Qwen).

Manage multiple provider configurations — each with its own API key, proxy URL, and model list — and switch between them instantly.

## Install

```bash
npm install -g @codefe/cc-manager
# or
pnpm add -g @codefe/cc-manager
```

Requires **Node.js >= 18**.

## Quick Start

```bash
# 1. Create a provider configuration
ccm add

# 2. Switch between configurations
ccm use

# 3. Pick a model from the active configuration
ccm model

# 4. Check your current status
ccm status

# 5. Check your balance
ccm usage
```

## Commands

| Command | Description |
|---------|-------------|
| `ccm add` | Create a new provider configuration |
| `ccm list` | List all configurations |
| `ccm use [name]` | Switch active configuration |
| `ccm edit [name]` | Edit a configuration |
| `ccm remove [name]` | Remove a configuration |
| `ccm model` | Select model from active config |
| `ccm usage` | Query API key balance/quota |
| `ccm status` | Show current active configuration |
| `ccm doctor` | Diagnose configuration issues |
| `ccm clone [source] [newName]` | Clone a configuration |
| `ccm export [name]` | Export configuration(s) to JSON |
| `ccm import <file>` | Import configurations from JSON |
| `ccm snapshot [name]` | Save current settings as a config |
| `ccm completion [shell]` | Generate shell completion script |

---

### `ccm add`

Interactively create a new named provider configuration.

Guides you through provider selection (LiteLLM, Bedrock, Vertex, DeepSeek, OpenRouter, Kimi, Zhipu, Ollama, Qwen, or fully manual) and model configuration.

```
$ ccm add
? Configuration name: my-deepseek
? How do you want to set up this configuration? DeepSeek
? API Key: ****
? API Timeout (ms): 600000
? Small/Fast Model: deepseek-chat
? How do you want to configure models? Select from built-in list
? Select models (space to toggle, enter to confirm):
  ...
? Activate this configuration now? Yes
Configuration "my-deepseek" created and activated.
```

### `ccm list`

List all saved configurations with their details. Alias: `ccm ls`.

Shows provider type, URL/region, model count, and the currently active model for each configuration.

```
$ ccm list

  Configurations
  ─────────────────────────────
  ● my-deepseek (active)
    Provider: DeepSeek
    URL:      https://api.deepseek.com/anthropic
    Models:   3
    Active:   deepseek-chat

  ○ work-bedrock
    Provider: AWS Bedrock
    Region:   us-east-1
    Models:   5

  ○ personal-litellm
    Provider: LiteLLM Proxy
    URL:      https://www.litellm.org/bedrock
    Models:   8
```

### `ccm use [name]`

Switch the active configuration. Without a name, shows a rich interactive selector with provider details for each config.

```
$ ccm use
? Select a configuration to activate:
❯ my-deepseek (current)   DeepSeek · https://api.deepseek.com/anthropic · 3 model(s) · active: deepseek-chat
  work-bedrock             AWS Bedrock · region: us-east-1 · 5 model(s)
  personal-litellm         LiteLLM Proxy · https://www.litellm.org/bedrock · 8 model(s)
```

You can also pass the name directly to skip the selector:

```
$ ccm use work-bedrock
Switched to "work-bedrock".
Settings written to ~/.claude/settings.json
```

Options:

- **`-p, --previous`** — Switch back to the previous configuration (like `cd -`)
- **`-l, --launch`** — Launch `claude` automatically after switching

```bash
# Quick switch back to the last used config
ccm use -p

# Switch and immediately start claude
ccm use work-bedrock -l
```

Switching clears all ccm-managed env keys from `settings.json` before writing the new provider's values, preventing stale keys from leaking between configurations.

### `ccm edit [name]`

Edit a configuration interactively. Without a name, shows a selector (with the active config pre-selected) so you can see all options at a glance.

```
$ ccm edit
? Select a configuration to edit:
❯ my-deepseek (active)   DeepSeek · https://api.deepseek.com/anthropic · 3 model(s)
  work-bedrock            AWS Bedrock · region: us-east-1 · 5 model(s)

? Editing "my-deepseek" — what do you want to change?
> Name
  Environment fields
  Add models
  Edit models
  Remove models
  Set fast model
  Done
```

Supports setting the **fast model** (`ANTHROPIC_SMALL_FAST_MODEL`) — choose from the config's model list, enter manually, or clear.

Changes to the active configuration are automatically synced to `settings.json`.

### `ccm remove [name]`

Remove a configuration. Alias: `ccm rm`. Without a name, shows a rich interactive selector.

```
$ ccm remove
? Select a configuration to remove:
❯ my-deepseek (active)   DeepSeek · https://api.deepseek.com/anthropic · 3 model(s)
  work-bedrock            AWS Bedrock · region: us-east-1 · 5 model(s)

? Remove "my-deepseek"? Yes
Removed active configuration. Settings cleaned up.
```

If the active configuration is removed, its env keys are cleaned up from `settings.json`.

### `ccm model`

Select a model from the active configuration's model list.

```
$ ccm model
Current model: us.anthropic.claude-opus-4-6-v1
? Select a model (personal-litellm):
  Claude Opus 4.6 (Preview)      us.anthropic.claude-opus-4-6-v1 (current)
  Claude Sonnet 4                 us.anthropic.claude-sonnet-4-20250514-v1:0
  GPT-5.2                         gpt-5.2
```

Updates both `ccm.json` and `settings.json`.

### `ccm usage`

Query your current API key's spending, budget, and expiration date.

```
$ ccm usage

  Usage Summary
  ─────────────────────────────
  Config:    personal-litellm
  Alias:      my-key
  Spent:      $5.02
  Budget:     $1000.00
  Remaining:  $994.98
  Expires:    2025-12-31 23:59:59
```

### `ccm status`

Show the current active configuration at a glance.

```
$ ccm status

  Current Configuration
  ─────────────────────────────
  Name:      my-deepseek
  Provider:  DeepSeek
  URL:       https://api.deepseek.com/anthropic
  Model:     deepseek-chat
  Models:    3
```

Options:

- **`--json`** — Output as JSON (for scripting)
- **`--short`** — One-line output (for shell prompts)

```bash
# Use in scripts
ccm status --json
# → {"active":"my-deepseek","provider":"DeepSeek","model":"deepseek-chat",...}

# Use in shell prompt (PS1)
ccm status --short
# → my-deepseek | DeepSeek | deepseek-chat
```

### `ccm doctor`

Diagnose configuration issues — checks file integrity, validates store data, verifies required fields, and confirms settings sync.

```
$ ccm doctor

  ccm doctor
  ─────────────────────────────

  Environment
    ccm version:  0.3.0
    Node.js:      v22.0.0
    Platform:     darwin arm64

  Files
    ✓ ccm.json
    ✓ settings.json

  Store
    ✓ 3 configuration(s) found
    ✓ Active: "my-deepseek"

  Active Configuration
    ✓ API Key (ANTHROPIC_AUTH_TOKEN)
    ✓ 3 model(s) configured
    ✓ Active model "deepseek-chat" is in model list
    ✓ settings.json in sync with active config

  All checks passed!
```

Use `--test-api` to also test API connectivity for the active config.

### `ccm clone [source] [newName]`

Clone (deep-copy) a configuration. Alias: `ccm cp`. Useful for creating variations of the same provider with different keys or model lists.

```bash
ccm clone my-deepseek my-deepseek-alt
# → Configuration "my-deepseek" cloned as "my-deepseek-alt".
```

### `ccm export [name]`

Export one or all configurations to a JSON file for backup or sharing.

```bash
# Export all configurations
ccm export -o backup.json

# Export a single configuration with secrets masked
ccm export my-deepseek --mask-secrets -o share.json
```

### `ccm import <file>`

Import configurations from a previously exported JSON file. Handles name conflicts with overwrite/rename/skip options.

```bash
ccm import backup.json
# → Imported 3 configuration(s).
```

### `ccm snapshot [name]`

Capture the current `settings.json` environment as a new ccm configuration. Useful for saving manual changes you've made outside of ccm.

```bash
ccm snapshot my-current-setup
# → Snapshot saved as "my-current-setup".
# → Detected provider: litellm
# → Captured 5 env var(s), 1 model(s).
```

### `ccm completion [shell]`

Generate shell completion scripts for bash, zsh, or fish. Auto-detects your shell if not specified.

```bash
# Add to ~/.zshrc
eval "$(ccm completion zsh)"

# Add to ~/.bashrc
eval "$(ccm completion bash)"

# Save for fish
ccm completion fish > ~/.config/fish/completions/ccm.fish
```

## Provider Templates

ccm ships with 9 built-in provider templates, each pre-configured with the correct environment variables and curated model lists:

| Template | Description |
|----------|-------------|
| **LiteLLM Proxy** | Connect through a LiteLLM proxy server (Bedrock mode) |
| **AWS Bedrock** | Direct AWS Bedrock access |
| **Google Vertex AI** | Google Cloud Vertex AI (uses gcloud ADC) |
| **DeepSeek** | DeepSeek API (native Anthropic format) |
| **OpenRouter** | OpenRouter API — access 320+ models from all providers |
| **Kimi (Moonshot)** | Moonshot AI / Kimi API |
| **Zhipu AI (z.ai / GLM)** | Zhipu AI / GLM / ChatGLM API |
| **Ollama (Local)** | Local Ollama instance — no API key required |
| **Qwen (Alibaba)** | Alibaba Qwen / DashScope API |

You can also use **Fully manual** mode to configure any provider with arbitrary environment variables.

## Built-in Models

When adding or editing a configuration, you can select from 42+ built-in models across 5 vendor groups (used for Bedrock/Vertex/manual configs), or choose from provider-specific curated lists (e.g., OpenRouter, DeepSeek, Ollama), or add custom model IDs.

<details>
<summary>Full built-in model list</summary>

**Anthropic (Claude)**

| Display Name | Model ID |
| --- | --- |
| Claude Opus 4.6 (Preview) | `us.anthropic.claude-opus-4-6-v1` |
| Claude Opus 4.5 (Preview) | `us.anthropic.claude-opus-4-5-20251101-v1:0` |
| Claude Opus 4.1 | `us.anthropic.claude-opus-4-1-20250805-v1:0` |
| Claude Opus 4 | `us.anthropic.claude-opus-4-20250514-v1:0` |
| Claude Sonnet 4.5 (Preview) | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Claude Sonnet 4 | `us.anthropic.claude-sonnet-4-20250514-v1:0` |
| Claude Haiku 4.5 (Preview) | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |
| Claude 3.7 Sonnet | `us.anthropic.claude-3-7-sonnet-20250219-v1:0` |
| Claude 3.5 Sonnet (v2) | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` |
| Claude 3.5 Sonnet (v1) | `us.anthropic.claude-3-5-sonnet-20240620-v1:0` |
| Claude 3.5 Haiku | `us.anthropic.claude-3-5-haiku-20241022-v1:0` |
| Claude 3 Opus | `us.anthropic.claude-3-opus-20240229-v1:0` |
| Claude 3 Sonnet | `us.anthropic.claude-3-sonnet-20240229-v1:0` |
| Claude 3 Haiku | `us.anthropic.claude-3-haiku-20240307-v1:0` |

**OpenAI (GPT)**

| Display Name | Model ID |
| --- | --- |
| GPT-5.2 (Flagship) | `gpt-5.2` |
| GPT-5.2 Codex | `gpt-5.2-codex` |
| GPT-5.1 | `gpt-5.1` |
| GPT-5.1 Chat | `gpt-5.1-chat` |
| GPT-5.1 Codex | `gpt-5.1-codex` |
| GPT-5.1 Codex Max | `gpt-5.1-codex-max` |
| GPT-5.1 Codex Mini | `gpt-5.1-codex-mini` |
| GPT-5 | `gpt-5` |
| GPT-5 Pro | `gpt-5-pro` |
| GPT-5 Chat | `gpt-5-chat` |
| GPT-5 Codex | `gpt-5-codex` |
| GPT-5 Mini | `gpt-5-mini` |
| GPT-5 Nano | `gpt-5-nano` |
| GPT-4o | `gpt-4o` |
| o4 Mini | `o4-mini` |

**Google (Gemini)**

| Display Name | Model ID |
| --- | --- |
| Gemini 3 Pro (Preview) | `gemini/gemini-3-pro-preview` |
| Gemini 2.5 Pro | `gemini/gemini-2.5-pro` |
| Gemini 2.5 Flash | `gemini/gemini-2.5-flash` |
| Gemini 2.0 Flash | `gemini/gemini-2.0-flash` |
| Gemini 2.0 Flash 001 | `gemini/gemini-2.0-flash-001` |
| Gemini 2.0 Flash Lite | `gemini/gemini-2.0-flash-lite` |

**Amazon & Others**

| Display Name | Model ID |
| --- | --- |
| Amazon Nova Pro | `us.amazon.nova-pro-v1:0` |
| Amazon Nova 2 Lite | `us.amazon.nova-2-lite-v1:0` |
| Writer Palmyra X4 | `us.writer.palmyra-x4-v1:0` |
| Veo 3.1 (Preview) | `vertex_ai/veo-3.1-generate-preview` |

**Embeddings**

| Display Name | Model ID |
| --- | --- |
| Text Embedding Ada 002 | `text-embedding-ada-002` |
| Text Embedding 3 Small | `text-embedding-3-small` |
| Text Embedding 3 Large | `text-embedding-3-large` |

</details>

<details>
<summary>Provider-specific model lists</summary>

**OpenRouter (Popular)**

| Display Name | Model ID |
| --- | --- |
| Claude Opus 4 | `anthropic/claude-opus-4` |
| Claude Sonnet 4 | `anthropic/claude-sonnet-4` |
| Claude Haiku 3.5 | `anthropic/claude-3.5-haiku` |
| GPT-4o | `openai/gpt-4o` |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` |
| DeepSeek R1 | `deepseek/deepseek-r1` |
| DeepSeek V3 | `deepseek/deepseek-chat` |
| Llama 4 Maverick | `meta-llama/llama-4-maverick` |
| Qwen3 235B | `qwen/qwen3-235b` |

**DeepSeek**

| Display Name | Model ID |
| --- | --- |
| DeepSeek-V3 | `deepseek-chat` |
| DeepSeek-R1 | `deepseek-reasoner` |
| DeepSeek-Coder-V2 | `deepseek-coder` |

**Kimi (Moonshot)**

| Display Name | Model ID |
| --- | --- |
| Moonshot v1 128K | `moonshot-v1-128k` |
| Moonshot v1 32K | `moonshot-v1-32k` |
| Moonshot v1 8K | `moonshot-v1-8k` |
| Kimi K2 | `kimi-k2` |

**Zhipu AI (GLM)**

| Display Name | Model ID |
| --- | --- |
| GLM-4-Plus | `glm-4-plus` |
| GLM-4-Long | `glm-4-long` |
| GLM-4-Flash | `glm-4-flash` |
| GLM-4-AirX | `glm-4-airx` |
| CodeGeeX-4 | `codegeex-4` |

**Ollama (Local)**

| Display Name | Model ID |
| --- | --- |
| Llama 3.1 8B | `llama3.1:8b` |
| Llama 3.1 70B | `llama3.1:70b` |
| CodeLlama 34B | `codellama:34b` |
| Mistral 7B | `mistral:7b` |
| DeepSeek Coder V2 | `deepseek-coder-v2:latest` |
| Qwen2.5 Coder 32B | `qwen2.5-coder:32b` |

**Qwen (Alibaba)**

| Display Name | Model ID |
| --- | --- |
| Qwen-Max | `qwen-max` |
| Qwen-Plus | `qwen-plus` |
| Qwen-Turbo | `qwen-turbo` |
| Qwen-Long | `qwen-long` |
| Qwen-Coder-Plus | `qwen-coder-plus` |
| Qwen-Coder-Turbo | `qwen-coder-turbo` |

</details>

## How It Works

`ccm` manages two files:

- **`~/.claude/ccm.json`** — stores all named provider configurations (name, env vars, model list), which one is active, and the previous active config for quick switch-back
- **`~/.claude/settings.json`** — the configuration file used by `claude-code`; ccm only modifies the `env` object and preserves all other fields. A backup (`settings.json.bak`) is created automatically before every write.

When you switch configurations with `ccm use`, ccm first clears all its managed env keys from `settings.json`, then writes the new provider's values. The managed key list is dynamically derived from all provider templates and includes keys like `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_SKIP_BEDROCK_AUTH`, `CLAUDE_CODE_USE_VERTEX`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_BEDROCK_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `AWS_REGION`, `ANTHROPIC_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL`, `API_TIMEOUT_MS`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, etc. This prevents stale keys from leaking between configurations.

## License

[MIT](LICENSE)
