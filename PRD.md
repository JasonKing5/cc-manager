这是一个非常实用的工具构想，旨在简化通过 LiteLLM/Bedrock 中转服务使用 `claude-code` 的配置流程。

以下是为您生成的详细产品需求文档（PRD），以及推荐的 npm 包名称。

---

# 产品需求文档 (PRD): Claude Code Configuration Manager

## 1. 产品概述
**产品名称**：cc-manager
**版本**：1.0.0
**描述**：一个轻量级的 Node.js CLI 工具，旨在帮助开发者快速配置 `claude-code` 的本地环境，使其能够顺利连接到第三方 Bedrock/LiteLLM 中转服务。它提供了便捷的登录鉴权、可视化的模型切换以及实时的额度查询功能。

## 2. 核心功能需求

### 2.1 初始化与登录 (`login`)
用户首次使用时，通过此命令配置连接所需的 API Key 和基础环境变量。

*   **触发指令**：`cc-manager login` (或 `ccm login`)
*   **交互流程**：
    1.  终端提示：`Please enter your API Key (sk-...):`
    2.  用户输入 Key（输入内容应脱敏显示或掩码）。
    3.  工具读取 `~/.claude/settings.json`（如果文件不存在则创建）。
    4.  **写入/更新逻辑**：保留文件中原有的所有其它字段，更新或覆盖 `env` 字段为以下默认值：
        ```json
        {
          "env": {
            "CLAUDE_CODE_USE_BEDROCK": "1",
            "CLAUDE_CODE_SKIP_BEDROCK_AUTH": "1",
            "ANTHROPIC_MODEL": "us.anthropic.claude-opus-4-6-v1",
            "ANTHROPIC_AUTH_TOKEN": "<用户输入的Key>",
            "ANTHROPIC_BEDROCK_BASE_URL": "https://www.litellm.org/bedrock",
            "AWS_REGION": "us-west-2"
          }
        }
        ```
    5.  提示：`✅ Configuration saved to ~/.claude/settings.json`

### 2.2 模型切换 (`model`)·
提供一个交互式的终端界面（TUI），允许用户按厂商分组浏览并选择模型，修改配置文件中的 `ANTHROPIC_MODEL`。

*   **触发指令**：`cc-manager model`
*   **交互界面**：
    *   使用 `inquirer` 或 `prompts` 库实现列表选择。
    *   支持键盘上下键移动，回车确认。
    *   **显示格式**：`[厂商] 易读简称 (全名)`
*   **模型数据映射表**：
    需将原始 Model ID 映射为易读格式，并按厂商分组（Anthropic, OpenAI, Google, Amazon, Other）。

    *(详细映射逻辑见附录 4.1)*

*   **执行逻辑**：
    用户选择后，仅更新 `settings.json` 中 `env.ANTHROPIC_MODEL` 的值，并提示切换成功。

### 2.3 用量查询 (`usage`)
调用 LiteLLM API 查询当前 Key 的余额、消耗及有效期。

*   **触发指令**：`cc-manager usage`
*   **前置条件**：需先运行 `login` 或确保配置文件中有 `ANTHROPIC_AUTH_TOKEN`。
*   **API 调用**：
    *   **URL**: `http://www.litellm.org/key/info?`
    *   **Method**: `GET`
    *   **Headers**: `Authorization: Bearer <ANTHROPIC_AUTH_TOKEN>`
*   **显示内容（精简优化版）**：
    需计算并展示以下字段：
    *   **用户别名 (Alias)**: `info.key_alias`
    *   **当前消耗 (Spent)**: `$5.02` (保留两位小数)
    *   **总预算 (Budget)**: `$1000.00` (如果 `max_budget` 为 null，显示 "Unlimited")
    *   **剩余额度 (Remaining)**: `Budget - Spent`
    *   **过期时间 (Expires)**: 格式化为 `YYYY-MM-DD HH:mm:ss` (转换 `info.expires`)

## 3. 技术规范

*   **开发语言**：TypeScript / JavaScript (Node.js)
*   **核心依赖库**：
    *   `commander` 或 `yargs`: 命令行参数解析。
    *   `inquirer` 或 `@inquirer/prompts`: 交互式选择列表。
    *   `chalk`: 终端彩色输出。
    *   `axios` 或 `node-fetch`: API 请求。
    *   `conf` 或直接使用 `fs`: 文件读写。
*   **配置文件路径**：`os.homedir() + '/.claude/settings.json'`

## 4. 附录：数据字典

### 4.1 模型分组与显示映射

在 TUI 中，建议使用分隔符（Separator）将不同厂商隔开。

**Group 1: Anthropic (Claude)**
| 简称 | 全名 (Model ID) |
| :--- | :--- |
| **Claude 3.7 Sonnet** | `us.anthropic.claude-3-7-sonnet-20250219-v1:0` |
| **Claude 3.5 Sonnet (v2)** | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` |
| **Claude 3.5 Sonnet (v1)** | `us.anthropic.claude-3-5-sonnet-20240620-v1:0` |
| **Claude 3.5 Haiku** | `us.anthropic.claude-3-5-haiku-20241022-v1:0` |
| **Claude 3 Opus** | `us.anthropic.claude-3-opus-20240229-v1:0` |
| **Claude 3 Sonnet** | `us.anthropic.claude-3-sonnet-20240229-v1:0` |
| **Claude 3 Haiku** | `us.anthropic.claude-3-haiku-20240307-v1:0` |
| **Claude Opus 4.6 (Preview)** | `us.anthropic.claude-opus-4-6-v1` |
| **Claude Opus 4.5 (Preview)** | `us.anthropic.claude-opus-4-5-20251101-v1:0` |
| **Claude Sonnet 4.5 (Preview)** | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| **Claude Haiku 4.5 (Preview)** | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |

**Group 2: OpenAI (GPT)**
| 简称 | 全名 (Model ID) |
| :--- | :--- |
| **GPT-5.2 (Flagship)** | `gpt-5.2` |
| **GPT-5.1 Codex Max** | `gpt-5.1-codex-max` |
| **GPT-5.1 Codex Mini** | `gpt-5.1-codex-mini` |
| **GPT-5 Pro** | `gpt-5-pro` |
| **GPT-5 Chat** | `gpt-5-chat` |
| **GPT-4o** | `gpt-4o` |
| **o4 Mini** | `o4-mini` |

**Group 3: Google (Gemini)**
| 简称 | 全名 (Model ID) |
| :--- | :--- |
| **Gemini 3 Pro (Preview)** | `gemini/gemini-3-pro-preview` |
| **Gemini 2.5 Pro** | `gemini/gemini-2.5-pro` |
| **Gemini 2.0 Flash** | `gemini/gemini-2.0-flash` |
| **Gemini 2.0 Flash Lite** | `gemini/gemini-2.0-flash-lite` |

**Group 4: Amazon & Others**
| 简称 | 全名 (Model ID) |
| :--- | :--- |
| **Amazon Nova Pro** | `us.amazon.nova-pro-v1:0` |
| **Writer Palmyra X4** | `us.writer.palmyra-x4-v1:0` |

---

**在 package.json 中配置 bin 命令为 `ccm`，方便用户敲击。**

例如：
```bash
ccm login
ccm model
ccm usage
```