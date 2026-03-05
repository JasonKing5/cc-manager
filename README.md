# cc-manager (ccm)

A lightweight CLI tool to configure [claude-code](https://docs.anthropic.com/en/docs/claude-code) for multiple providers (AWS Bedrock, Google Vertex AI, LiteLLM proxies, DeepSeek).

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

# 4. Check your balance
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

---

### `ccm add`

Interactively create a new named provider configuration.

Guides you through provider selection (LiteLLM, Bedrock, Vertex, DeepSeek, or fully manual) and model configuration.

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
    URL:      https://proxy.example.com
    Models:   8
```

### `ccm use [name]`

Switch the active configuration. Without a name, shows a rich interactive selector with provider details for each config.

```
$ ccm use
? Select a configuration to activate:
❯ my-deepseek (current)   DeepSeek · https://api.deepseek.com/anthropic · 3 model(s) · active: deepseek-chat
  work-bedrock             AWS Bedrock · region: us-east-1 · 5 model(s)
  personal-litellm         LiteLLM Proxy · https://proxy.example.com · 8 model(s)
```

You can also pass the name directly to skip the selector:

```
$ ccm use work-bedrock
Switched to "work-bedrock".
Settings written to ~/.claude/settings.json
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
  Remove models
  Done
```

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

## Built-in Models

When adding or editing a configuration, you can select from 42+ built-in models across 5 vendor groups, or add custom model IDs.

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

## How It Works

`ccm` manages two files:

- **`~/.claude/ccm.json`** — stores all named provider configurations (name, env vars, model list) and which one is active
- **`~/.claude/settings.json`** — the configuration file used by `claude-code`; ccm only modifies the `env` object and preserves all other fields

When you switch configurations with `ccm use`, ccm first clears all its managed env keys from `settings.json`, then writes the new provider's values. The managed key list is dynamically derived from all provider templates and includes keys like `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `AWS_REGION`, `ANTHROPIC_MODEL`, `API_TIMEOUT_MS`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, etc. This prevents stale keys from leaking between configurations.

## License

[MIT](LICENSE)
