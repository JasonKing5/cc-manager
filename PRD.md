# 产品需求文档 (PRD): Claude Code Configuration Manager

## 1. 产品概述

**产品名称**：cc-manager
**版本**：0.1.0
**描述**：一个轻量级的 Node.js CLI 工具，帮助开发者管理多套 `claude-code` 提供商配置。支持 AWS Bedrock、Google Vertex AI、LiteLLM 代理、DeepSeek（原生 Anthropic 格式）等提供商，在不同的 API Key、端点和模型列表之间快速切换，实现多场景（个人/公司/不同提供商）的无缝管理。

## 2. 核心功能需求

### 2.1 添加配置 (`add`)

通过交互式流程创建一套命名的代理服务配置。

*   **触发指令**：`ccm add`
*   **交互流程**：
    1.  输入配置名称（校验非空、不重复）
    2.  选择提供商模板（LiteLLM / Bedrock / Vertex / DeepSeek / 手动配置）
    3.  根据模板提示输入 env 变量（固定值自动设置，密钥掩码输入，可选字段显示默认值）
        *   手动模式：逐个输入环境变量，自动检测密钥字段（key/secret/token）使用掩码输入，每条后确认"是否继续添加"
    4.  选择模型配置方式：
        *   **方式一**：从内置模型列表多选（checkbox，按厂商分组），之后可逐个追加自定义模型
        *   **方式二**：批量输入模型 ID（逗号分隔）
    5.  确认是否立即激活此配置（默认 yes）
    6.  若激活 → 写入 `~/.claude/settings.json`

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
*   **行为**：无参数时显示配置选择器（活跃配置预选中），用户可以看到所有配置的详细信息后再选择要编辑的配置
*   **交互菜单**：
    *   Name — 重命名
    *   环境变量 — 根据提供商模板修改可编辑字段（非固定值字段）
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
*   **API 调用**：自动从代理 Base URL 推导 API 地址，请求 `/key/info`
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

切换配置时，所有模板中定义的 env key 会被先清除再写入，避免旧配置残留。管理的 key 从 `PROVIDER_TEMPLATES` 动态派生，包括但不限于：

| Key | 说明 |
| :--- | :--- |
| `ANTHROPIC_BASE_URL` | 统一 Anthropic API 端点（LiteLLM / DeepSeek） |
| `ANTHROPIC_AUTH_TOKEN` | API Key |
| `CLAUDE_CODE_USE_BEDROCK` | 启用 Bedrock 模式 |
| `CLAUDE_CODE_USE_VERTEX` | 启用 Vertex AI 模式 |
| `AWS_REGION` | AWS 区域 |
| `AWS_ACCESS_KEY_ID` | AWS 访问密钥 ID |
| `AWS_SECRET_ACCESS_KEY` | AWS 秘密访问密钥 |
| `CLOUD_ML_REGION` | Vertex AI 区域 |
| `ANTHROPIC_VERTEX_PROJECT_ID` | GCP 项目 ID |
| `API_TIMEOUT_MS` | API 超时时间（毫秒） |
| `ANTHROPIC_SMALL_FAST_MODEL` | 小型快速模型（如 deepseek-chat） |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | 禁用非必要流量 |
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

## 6. 权限与插件生态管理 (v0.2.0 增强)

针对 Claude Code 的权限系统（`allow`/`deny`）和官方插件（Plugins/MCP）体系，引入一套结构化、可复用的分级管理机制。解决权限文件随时间推移变得臃肿、多项目间权限需要重复配置等痛点。

### 6.1 权限层级与架构说明

`cc-manager` 将在底层协同管理以下三个维度的配置文件，通过深拷贝与智能合并进行读写，确保配置的安全性：

1.  **Global Base (`~/.claude/settings.json`)**：全局基础配置（管理环境变量、`enabledPlugins`、`defaultMode`）。
2.  **Global Local (`~/.claude/settings.local.json`)**：用户级全局权限（User-level Permissions）。在此定义的所有 `Bash(xxx:*)` 或 `WebFetch(xxx)` 将作为全局 fallback 生效于所有项目。
3.  **Project Local (`$PWD/.claude/settings.local.json`)**：项目级独有权限。仅对当前目录生效的专属指令、特定插件的 MCP 方法等。

### 6.2 项目权限初始化 (`perm init`)

为新项目一键生成并写入标准化的项目级权限，同时支持拉取/继承 User 级别的模板权限。

*   **触发指令**：`ccm perm init`
*   **前置条件**：在特定项目根目录下执行。
*   **交互流程**：
    1.  **选择项目模板**：提示用户选择当前项目类型（如 `Node.js / Frontend`, `Python`, `Generic` 等），以生成匹配的默认权限白名单（如 Node 项目默认赋予 `Bash(pnpm *:*)`, `Bash(npm run *:*)`, `Bash(npx *:*)`）。
    2.  **选择需要激活的 MCP 插件**：列出当前全局已安装的官方插件（如 `playwright`, `supabase`），询问是否在该项目中允许其全部方法（如勾选则自动生成 `mcp__playwright__browser_*:*` 权限）。
    3.  **引入 User 级通用权限**：询问 _"是否将全局常用文件/网络操作 (如 git, find, ls, cat) 显式复制到当前项目？(推荐)"_。
    4.  **生成与写入**：自动创建或合并到 `$PWD/.claude/settings.local.json` 的 `permissions.allow` 数组中。

### 6.3 权限概览与审计 (`perm list` / `perm audit`)

提供清洗后的可视化视图，将混乱的 JSON 权限数组分类展示，并智能识别冗余的单次历史命令。

*   **触发指令**：`ccm perm ls` 或 `ccm perm audit`
*   **输出格式**：
    1.  **作用域提示**：明确标示当前读取的文件来源（Global Local & Project Local）。
    2.  **模块化分类展示**：
        *   🌐 **网络访问 (WebFetch/WebSearch)**：提取域名列表（如 `github.com`, `docs.nestjs.com`）。
        *   🔌 **插件与 MCP (mcp__*)**：按插件名称聚类展示（如 `playwright (7 methods)`, `supabase (3 methods)`）。
        *   💻 **终端命令 (Bash)**：按工具命令分组（如 `git: clone, push, log`, `pnpm: dev, build, lint`）。
    3.  **冗余检测告警 (Audit)**：自动扫描包含绝对路径（如 `/Users/...`）、临时目录（如 `/private/tmp/...`）或没有结尾通配符 `:*` 的过长命令，在底部输出：*⚠️ 发现 15 条硬编码的单次执行命令。运行 `ccm perm clean` 进行清理和优化。*

### 6.4 权限清理与合并优化 (`perm clean`)

帮助用户将 Claude Code 自动生成的冗长、一次性命令提取为通配符规则，清理无用记录。

*   **触发指令**：`ccm perm clean`
*   **执行逻辑**：
    1.  **询问作用域**：清理 Global 还是 Current Project。
    2.  **智能提取与建议（交互式 Checkbox）**：
        *   **通配符转换建议**：识别 `Bash(pnpm run lint --fix)`，建议替换为 `Bash(pnpm run lint:*)`。
        *   **垃圾清理建议**：识别出带有系统临时目录或带管道符 `| grep` 的复杂查询命令，建议直接删除。
        *   **同类合并建议**：检测到多个相同的 base command（如 5 个不同的 `git log` 参数），建议合并为 `Bash(git log:*)`。
    3.  **安全备份**：确认覆写前，自动将原文件备份为 `.local.json.bak`。
    4.  **执行覆写**：更新目标文件的 `permissions.allow` 数组。

### 6.5 官方插件生态管理 (`plugin`)

对 `@claude-plugins-official` 生态进行快捷管理，并在启停时自动处理权限关联。

*   **触发指令**：`ccm plugin`
*   **执行逻辑**：
    1.  解析 `~/.claude/settings.json` 的 `enabledPlugins`。
    2.  交互式多选列表：展示所有已知/已安装的插件（如 `frontend-design`, `supabase`, `playwright`），并标记当前 `[ON]` / `[OFF]` 状态。
    3.  **状态切换联动**：
        *   当开启某个插件时：自动更新 `settings.json`，并询问 *"是否立即为当前项目(.local.json)赋予该插件的 MCP 权限？"*
        *   当关闭某个插件时：更新 `settings.json`。

### 6.6 执行模式切换 (`mode`)

快捷切换 Claude Code 的交互行为模式。

*   **触发指令**：`ccm mode`
*   **行为**：在 `plan`（规划模式，执行危险操作前询问）和 `act`（直接执行模式）之间进行 select 切换。
*   **更新目标**：直接修改 `~/.claude/settings.json` 中的 `permissions.defaultMode` 字段。

---

## 7. 数据结构更新补充

为了支持第 6 章的权限与插件管理，需在 `config-utils.ts` 中新增以下内部数据模型和解析方法：

### 7.1 权限规则解析模型
```ts
// 用于将原始的 "Bash(git log --oneline)" 解析为结构化数据的内部模型
interface ParsedPermission {
  raw: string;          // 原始字符串，如 "Bash(pnpm dev:*)"
  type: 'Bash' | 'WebFetch' | 'WebSearch' | 'MCP' | 'Unknown';
  baseCommand?: string; // 如 "pnpm"
  subCommand?: string;  // 如 "dev"
  domain?: string;      // 如 "github.com"
  pluginName?: string;  // 如 "playwright"
  method?: string;      // 如 "browser_navigate"
  isWildcard: boolean;  // 是否以 :* 结尾
  isHardcoded: boolean; // 是否包含绝对路径或复杂管道符（用于 Audit 告警）
}
```

### 7.2 默认项目权限模板 (内置于 CCM)
```ts
const PERMISSION_TEMPLATES = {
  "Node.js":[
    "Bash(pnpm *:*)", "Bash(npm *:*)", "Bash(npx *:*)", "Bash(node:*)",
    "Bash(tsc:*)", "Bash(biome:*)", "Bash(eslint:*)"
  ],
  "Generic":[
    "Bash(git *:*)", "Bash(find:*)", "Bash(ls:*)", "Bash(cat:*)", 
    "Bash(grep:*)", "Bash(echo:*)", "Bash(head:*)", "Bash(wc:*)",
    "mcp__ide__getDiagnostics"
  ]
};
```