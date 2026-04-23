# cc-manager (ccm)

用于管理 [claude code](https://docs.anthropic.com/en/docs/claude-code) 多个 Provider 配置的 CLI 工具 —— 一键切换 Provider、模型和权限。

**支持的 Provider：** AWS Bedrock · Google Vertex AI · LiteLLM · DeepSeek · OpenRouter · Kimi · 智谱 · Ollama · 通义千问 · SiliconFlow · Azure AI Foundry

同时支持管理 **OpenAI Codex** 配置（`~/.codex/auth.json` + `~/.codex/config.toml`）。

## 安装

```bash
npm install -g @codefe/cc-manager
# 或
pnpm add -g @codefe/cc-manager
```

需要 **Node.js >= 18**。

## 快速开始

```bash
ccm add          # 创建 Provider 配置
ccm use          # 切换当前配置
ccm model        # 选择模型
ccm usage        # 查看余额和今日花费
ccm status       # 查看当前激活配置
```

## 核心命令

### 配置管理

| 命令 | 说明 |
|------|------|
| `ccm add` | 交互式向导创建新配置 |
| `ccm list` | 列出所有配置（Provider、URL、模型数量） |
| `ccm use [名称]` | 切换激活配置，同步写入 `settings.json` |
| `ccm use -p` | 切回上一个配置（类似 `cd -`） |
| `ccm use <名称> -l` | 切换配置并立即启动 `claude` |
| `ccm edit [名称]` | 修改环境变量、模型列表或快速模型 |
| `ccm remove [名称]` | 删除配置 |
| `ccm model` | 从当前配置中选择模型 |

### 实用工具

| 命令 | 说明 |
|------|------|
| `ccm status` | 显示当前配置名、Provider、模型 |
| `ccm status --short` | 单行输出，适合嵌入 shell 提示符 |
| `ccm status --json` | JSON 格式输出，方便脚本调用 |
| `ccm usage` | 余额、预算、到期时间 + 自动每日花费追踪 |
| `ccm usage -H` | 显示花费历史（默认最近 7 天） |
| `ccm usage -H -v` | 历史 + 按模型细分 |
| `ccm doctor` | 诊断配置问题，检查 settings 同步状态 |
| `ccm doctor --test-api` | 同时测试 API 连通性 |

### 权限与插件

| 命令 | 说明 |
|------|------|
| `ccm perm init` | 从模板初始化权限配置 |
| `ccm perm ls` | 按作用域和分类列出当前权限 |
| `ccm perm audit` | 检测冗余或有问题的权限 |
| `ccm perm clean` | 合并清理冗余权限 |
| `ccm plugin` | 开关 MCP 插件（自动补充权限） |
| `ccm mode` | 切换执行模式：`plan`（确认后执行）/ `act`（直接执行） |

### 导入导出

| 命令 | 说明 |
|------|------|
| `ccm clone [源] [名称]` | 深拷贝一个配置 |
| `ccm export [-o 文件]` | 导出配置为 JSON（支持 `--mask-secrets` 隐藏密钥） |
| `ccm import <文件>` | 从 JSON 导入配置，冲突时交互处理 |
| `ccm snapshot [名称]` | 将当前 `settings.json` 状态保存为配置 |

### Codex 管理

管理 OpenAI Codex 配置（写入 `~/.codex/auth.json` 和 `~/.codex/config.toml`）。

| 命令 | 说明 |
|------|------|
| `ccm codex add` | 新建 Codex 配置（填入中转地址和 API Key） |
| `ccm codex list` | 列出所有 Codex 配置 |
| `ccm codex use [名称]` | 激活配置，写入 `~/.codex` 文件 |
| `ccm codex edit [名称]` | 修改名称、中转地址或 API Key |
| `ccm codex remove [名称]` | 删除已保存的配置 |

### Shell 补全

```bash
eval "$(ccm completion zsh)"   # 也支持 bash / fish
```

## 亮点功能

**极速切换 Provider** — `ccm use` 只修改 `settings.json` 的 `env` 字段，自动清除上一个 Provider 的残留 key，切换秒级完成。

**每日花费自动追踪** — `ccm usage` 首次运行时自动记录当日基准值，此后每次调用都会显示今日增量花费，无需手动操作。

**快速模型支持** — 通过 `ccm edit → Set fast model` 为每个配置单独设置 `ANTHROPIC_SMALL_FAST_MODEL`，用于并行/后台任务。

**嵌入 shell 提示符** — 在终端随时看到当前激活的配置：
```bash
# 加入 ~/.zshrc
PS1='$(ccm status --short) $ '
# → my-deepseek | DeepSeek | deepseek-chat $
```

**权限精细管理** — `ccm perm` 支持全局和项目两个作用域，提供模板初始化、冗余检测、MCP 通配符自动生成等功能。

## 工作原理

ccm 管理以下文件：

- **`~/.ccm/claude.json`** — 所有 Claude Code 命名配置（环境变量、模型列表、当前激活、上一个激活）；首次运行时自动从 `~/.claude/ccm.json` 迁移
- **`~/.ccm/codex.json`** — 所有 Codex 命名配置（中转地址、API Key、当前激活）
- **`~/.claude/settings.json`** — claude-code 的配置文件；ccm 只修改其中的 `env` 字段，其他内容保持不变，每次写入前自动备份为 `settings.json.bak`
- **`~/.codex/auth.json`** + **`~/.codex/config.toml`** — 由 `ccm codex use` 写入；仅修改 `base_url` 和 `OPENAI_API_KEY`，其余配置原样保留

## License

[MIT](LICENSE)
