# WorkAgent — 版本补丁智能助手

> 专为软件研发与运维人员打造的 AI 驱动知识库与补丁管理平台

## ✨ 核心功能

- **🤖 AI 智能定位助手** — 基于 DeepSeek 大模型，描述现象即可快速分析代码 Bug 方向，自动记录定位结论
- **📋 结构化已知问题库** — 全维度管理产品/服务/版本维度的技术问题，支持按严重度、状态、服务筛选
- **🔖 版本补丁合入清单** — 选定产品与目标版本后，一键查看哪些问题未修复、跨版本漏合，精准生成出补丁清单
- **🗂️ 产品拓扑管理** — 维护多产品、多版本、多服务的层级拓扑结构，AI 可自动固化规则
- **📊 实时看板** — 问题总数、分析中、已定位、高风险等核心指标一览

## 🛠️ 技术栈

| 层次 | 技术 |
|:---|:---|
| 前端 | Svelte 5 + Vite |
| 后端 | Express + TypeScript，通过 **tsx** 运行（Node.js 原生执行 TS）|
| 数据库 | SQLite（Node.js >= 20 内置，无需额外安装）|
| AI 对话 | OpenAI Compatible API（默认 DeepSeek）|
| 样式 | Vanilla CSS（Apple Glass + Linear Precision 融合设计）|

## 🚀 快速启动

### 1. 克隆项目

```bash
git clone <你的仓库地址>
cd workagent
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 API Key

启动后进入 **系统配置** 页面，填写：

- **API Key** — DeepSeek 或任意 OpenAI 兼容服务的 Key
- **Base URL** — 默认 `https://api.deepseek.com/v1`
- **Model** — 默认 `deepseek-chat`

> API Key 保存在本地 SQLite 数据库中，不会上传到代码仓库。

### 4. 启动项目

#### 方式 A — 一键启动（推荐，Windows）

```powershell
# 启动（后台运行，自动打开浏览器）
.\start.ps1

# 停止
.\stop.ps1
```

> 如果提示「脚本执行被禁止」，先以管理员身份运行一次：
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

#### 方式 B — 手动启动（两个终端）

```bash
# 终端 1 — 后端
npx tsx watch server/index.ts

# 终端 2 — 前端
npm run dev
```

打开浏览器访问 **http://localhost:5173** 即可使用。

---

## 📁 项目结构

```
workagent/
├── server/                 # 后端 Express 服务
│   ├── agent/              # AI Agent 逻辑 (LLM Client + Tools)
│   ├── db/                 # SQLite 数据库初始化与查询
│   ├── routes/             # API 路由 (chat / issues / products / settings)
│   └── index.ts            # 后端入口
├── src/                    # 前端 Svelte 应用
│   ├── lib/
│   │   ├── components/
│   │   │   ├── chat/       # AI 对话界面
│   │   │   ├── dashboard/  # 已知问题看板
│   │   │   ├── settings/   # 系统配置
│   │   │   └── shared/     # 公共组件 (Navbar, AppleSelect...)
│   │   └── api/            # 前端 API 客户端
│   └── app.css             # 全局设计 Token
├── data/                   # SQLite 数据库 (运行时自动创建，已 gitignore)
└── scripts/                # 辅助脚本
```

## 💡 使用指南

### AI 助手

- 直接描述问题现象，AI 给出排查思路
- 说"**帮我记录这个问题**"，AI 自动创建结构化问题记录
- 说"**CSP 23.1 出补丁需要带哪些问题**"，AI 调用工具生成补丁清单

### 已知问题管理

- 支持按产品、版本、服务、状态多维筛选与分页
- 点击"详情"查看版本修复矩阵和完整根因分析
- AI 对话可自动填充根因、影响范围等字段

### 补丁清单

- 在筛选栏选中产品 + 版本，点击"补丁提醒清单"
- 仅展示该版本**未修复**的问题，精准防止漏合

## 📝 数据说明

- 所有数据存储在 `data/workagent.db`（SQLite 本地文件）
- 该文件已加入 `.gitignore`，**不会**提交到代码仓库
- 新机器部署时数据库自动初始化为空，如需迁移数据请手动拷贝 `data/workagent.db` 文件到新机器同路径下

## 环境要求

- **Node.js** >= 20.0（需支持原生 SQLite 模块）
- **npm** >= 9.0

---

> Built with ❤️ by WorkAgent + Google Antigravity AI
