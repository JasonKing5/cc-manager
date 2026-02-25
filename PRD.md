# 产品需求文档 (PRD): Claude Code Configuration Manager

## 1. 产品概述

**产品名称**：cc-manager
**版本**：0.1.0
**描述**：一个轻量级的 Node.js CLI 工具，帮助开发者管理多套 `claude-code` 代理服务配置。支持在不同的 API Key、代理地址（LiteLLM、OpenRouter、智谱、DeepSeek 等）和模型列表之间快速切换，实现多场景（个人/公司/不同代理）的无缝管理。

## 2. 核心功能需求

### 2.1 添加配置 (`add`)

通过交互式流程创建一套命名的代理服务配置。

*   **触发指令**：`ccm add`
*   **交互流程**：
    1.  输入配置名称（校验非空、不重复）
    2.  输入代理 Base URL（默认 `https://www.litellm.org/bedrock`）
    3.  输入 API Key（掩码输入）
    4.  输入 AWS Region（默认 `us-west-2`，可留空跳过）
    5.  选择模型配置方式：
        *   **方式一**：从内置模型列表多选（checkbox，按厂商分组），之后可逐个追加自定义模型
        *   **方式二**：批量输入模型 ID（逗号分隔）
    6.  确认是否立即激活此配置（默认 yes）
    7.  若激活 → 写入 `~/.claude/settings.json`

### 2.2 列出配置 (`list`)

以格式化列表展示所有已保存的配置，标记当前激活项。

*   **触发指令**：`ccm list`（别名 `ccm ls`）
*   **输出格式**：
    ```
      Configurations
      ─────────────────────────────
      ● personal-litellm (active)
        URL:    https://www.litellm.org/bedrock
        Region: us-west-2
        Models: 3
        Active: us.anthropic.claude-opus-4-6-v1

      ○ company-deepseek
        URL:    https://company-proxy.example.com/bedrock
        Region: us-east-1
        Models: 2
    ```

### 2.3 切换配置 (`use`)

激活指定配置，将其 env 写入 `settings.json`。

*   **触发指令**：`ccm use [name]`
*   **行为**：
    *   有参数：直接切换到指定配置
    *   无参数：交互式 select 列表选择
*   **切换逻辑**：
    1.  清除 `settings.json` 中所有 ccm 管理的 env key
    2.  写入目标配置的 env
    3.  更新 `ccm.json` 的 active 字段

### 2.4 编辑配置 (`edit`)

通过交互菜单修改已有配置的各项属性。

*   **触发指令**：`ccm edit [name]`
*   **行为**：无参数时编辑当前激活配置
*   **交互菜单**：
    *   Name — 重命名
    *   Base URL — 修改代理地址
    *   API Key — 修改密钥（显示掩码后的当前值）
    *   Region — 修改或清除区域
    *   Add models — 从内置列表多选 + 追加自定义模型
    *   Remove models — 从当前模型列表多选删除（自动处理活跃模型被删除的情况）
    *   Done — 保存退出
*   若编辑的是 active 配置，同步更新 `settings.json`

### 2.5 删除配置 (`remove`)

删除一套命名配置。

*   **触发指令**：`ccm remove [name]`（别名 `ccm rm`）
*   **行为**：无参数时交互选择
*   **确认**：删除前 confirm 确认
*   若删除的是 active 配置 → 清除 `settings.json` 中的 ccm 管理的 env key，并将 active 置空

### 2.6 模型切换 (`model`)

从当前激活配置的模型列表中选择模型。

*   **触发指令**：`ccm model`
*   **前置条件**：需有活跃配置且配置中有模型
*   **行为**：
    *   显示当前模型
    *   从活跃配置的 models 列表中 select
    *   同时更新 `settings.json` 和 `ccm.json` 中的 `ANTHROPIC_MODEL`

### 2.7 用量查询 (`usage`)

调用代理服务 API 查询当前 Key 的余额、消耗及有效期。

*   **触发指令**：`ccm usage`
*   **数据来源**：优先从活跃配置读取 token 和 base URL，回退到 `settings.json`
*   **API 调用**：自动从代理 Base URL 推导 API 地址（去除 `/bedrock` 后缀），请求 `/key/info`
*   **显示内容**：
    *   配置名称（如有活跃配置）
    *   用户别名 (Alias)
    *   当前消耗 (Spent)
    *   总预算 (Budget)
    *   剩余额度 (Remaining)
    *   过期时间 (Expires)

## 3. 数据结构

### 3.1 存储文件：`~/.claude/ccm.json`

```ts
interface ProviderConfig {
  name: string;                    // 配置名称
  env: Record<string, string>;     // 完整 env 字典（写入 settings.json 的内容）
  models: { name: string; value: string }[]; // 该配置可用的模型列表
}

interface CcmStore {
  active: string | null;           // 当前激活的配置名称
  providers: Record<string, ProviderConfig>;
}
```

### 3.2 ccm 管理的 env key

切换配置时，以下 key 会被先清除再写入，避免旧配置残留：

| Key | 说明 |
| :--- | :--- |
| `CLAUDE_CODE_USE_BEDROCK` | 启用 Bedrock 模式 |
| `CLAUDE_CODE_SKIP_BEDROCK_AUTH` | 跳过 Bedrock 原生鉴权 |
| `ANTHROPIC_AUTH_TOKEN` | API Key |
| `ANTHROPIC_BEDROCK_BASE_URL` | 代理 Base URL |
| `AWS_REGION` | AWS 区域 |
| `ANTHROPIC_MODEL` | 当前模型 |

## 4. 技术规范

*   **运行环境**：Node.js >= 18
*   **模块系统**：ESM-only（`"type": "module"`）
*   **核心依赖**：
    *   `commander`：命令行参数解析
    *   `@inquirer/prompts`：交互式选择（select / checkbox / input / password / confirm）
    *   `chalk`：终端彩色输出
    *   原生 `fetch`（Node 18+）：API 请求，无需第三方 HTTP 库
*   **配置文件**：
    *   `~/.claude/settings.json` — claude-code 的配置文件（仅修改 `env` 字段）
    *   `~/.claude/ccm.json` — ccm 自身的多配置存储

## 5. 附录：内置模型列表

内置模型按厂商分为 5 组，用于 `add` / `edit` 命令的模型选择。用户也可添加自定义模型。

**Anthropic (Claude)** — 14 个模型
**OpenAI (GPT)** — 15 个模型
**Google (Gemini)** — 6 个模型
**Amazon & Others** — 4 个模型
**Embeddings** — 3 个模型

---

**在 package.json 中配置 bin 命令为 `ccm`，方便用户使用。**

```bash
ccm add        # 添加新配置
ccm list       # 列出所有配置
ccm use        # 切换激活配置
ccm edit       # 修改配置
ccm remove     # 删除配置
ccm model      # 选择模型
ccm usage      # 查询用量
```
