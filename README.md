# cc-manager (ccm)

A lightweight CLI tool to configure [claude-code](https://docs.anthropic.com/en/docs/claude-code) for Bedrock/LiteLLM proxy services.

Manage API keys, switch models interactively, and check usage quota — all from a single command.

## Install

```bash
npm install -g cc-manager
# or
pnpm add -g cc-manager
```

Requires **Node.js >= 18**.

## Quick Start

```bash
# 1. Configure your API key
ccm login

# 2. Pick a model
ccm model

# 3. Check your balance
ccm usage
```

## Commands

### `ccm login`

Set up your API key and initialize the environment variables needed by `claude-code`.

```
$ ccm login
? Please enter your API Key (sk-...): ****
✅ Configuration saved to ~/.claude/settings.json
```

This writes the following defaults into `~/.claude/settings.json` under the `env` key (existing fields are preserved):

| Variable | Default |
| --- | --- |
| `CLAUDE_CODE_USE_BEDROCK` | `1` |
| `CLAUDE_CODE_SKIP_BEDROCK_AUTH` | `1` |
| `ANTHROPIC_MODEL` | `us.anthropic.claude-opus-4-6-v1` |
| `ANTHROPIC_AUTH_TOKEN` | *(your key)* |
| `ANTHROPIC_BEDROCK_BASE_URL` | `https://www.litellm.org/bedrock` |
| `AWS_REGION` | `us-west-2` |

### `ccm model`

Interactively browse and select a model, grouped by vendor.

```
$ ccm model
Current model: us.anthropic.claude-opus-4-6-v1
? Select a model:
── Anthropic (Claude) ──
❯ Claude Opus 4.6 (Preview)   us.anthropic.claude-opus-4-6-v1
  Claude Opus 4.5 (Preview)   us.anthropic.claude-opus-4-5-20251101-v1:0
  Claude Sonnet 4.5 (Preview) us.anthropic.claude-sonnet-4-5-20250929-v1:0
  ...
── OpenAI (GPT) ──
  GPT-5.2 (Flagship)          gpt-5.2
  ...
── Google (Gemini) ──
  Gemini 2.5 Pro               gemini/gemini-2.5-pro
  ...
── Amazon & Others ──
  Amazon Nova Pro              us.amazon.nova-pro-v1:0
  ...
```

Only the `ANTHROPIC_MODEL` value in `settings.json` is updated — all other fields remain untouched.

### `ccm usage`

Query your current API key's spending, budget, and expiration date via the LiteLLM API.

```
$ ccm usage

  Usage Summary
  ─────────────────────────────
  Alias:      my-key
  Spent:      $5.02
  Budget:     $1000.00
  Remaining:  $994.98
  Expires:    2025-12-31 23:59:59
```

## Supported Models

<details>
<summary>Full model list (24 models)</summary>

**Anthropic (Claude)**

| Display Name | Model ID |
| --- | --- |
| Claude Opus 4.6 (Preview) | `us.anthropic.claude-opus-4-6-v1` |
| Claude Opus 4.5 (Preview) | `us.anthropic.claude-opus-4-5-20251101-v1:0` |
| Claude Sonnet 4.5 (Preview) | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
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
| GPT-5.1 Codex Max | `gpt-5.1-codex-max` |
| GPT-5.1 Codex Mini | `gpt-5.1-codex-mini` |
| GPT-5 Pro | `gpt-5-pro` |
| GPT-5 Chat | `gpt-5-chat` |
| GPT-4o | `gpt-4o` |
| o4 Mini | `o4-mini` |

**Google (Gemini)**

| Display Name | Model ID |
| --- | --- |
| Gemini 3 Pro (Preview) | `gemini/gemini-3-pro-preview` |
| Gemini 2.5 Pro | `gemini/gemini-2.5-pro` |
| Gemini 2.0 Flash | `gemini/gemini-2.0-flash` |
| Gemini 2.0 Flash Lite | `gemini/gemini-2.0-flash-lite` |

**Amazon & Others**

| Display Name | Model ID |
| --- | --- |
| Amazon Nova Pro | `us.amazon.nova-pro-v1:0` |
| Writer Palmyra X4 | `us.writer.palmyra-x4-v1:0` |

</details>

## How It Works

`ccm` reads and writes `~/.claude/settings.json`, the configuration file used by `claude-code`. It only modifies the `env` object within that file and preserves all other fields.

The `usage` command calls the LiteLLM `/key/info` API endpoint using the stored `ANTHROPIC_AUTH_TOKEN`.

## License

[MIT](LICENSE)
