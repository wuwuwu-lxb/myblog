# llm-selfwiki

个人动态博客、日记与知识库系统，并提供一个只基于公开内容回答问题的 self-LLM 个人 AI 分身。

项目采用单体 Next.js 架构，面向低配置服务器部署。公开内容、私有写作后台、媒体管理、访问统计和 LLM 对话由同一个服务提供，数据保存在本机 SQLite 和文件系统中。

## 当前能力

- 公开首页、博客、日记、分类页和标签页
- 日记、笔记、文章、公开记忆四种内容类型
- 私有、草稿、公开三种可见性
- GitHub OAuth 单用户后台鉴权
- 内容、分类、标签和媒体管理
- SQLite 内容存储与本地图片上传
- 基于公开内容检索的 self-LLM，支持问答和聊天模式
- OpenAI Chat Completions 兼容的流式 LLM 接口
- giscus 评论、访问统计、访客地图和 Tailscale 在线状态

产品背景和设计资料位于：

- [产品说明](docs/product-brief.md)
- [前端调研](docs/frontend-research.md)

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript 6
- Node.js 内置 SQLite
- 本地文件系统媒体存储
- GitHub OAuth
- OpenAI 兼容 LLM API

## 环境要求

- Node.js 22 或更高版本
- npm
- 可写的 `data/` 和 `storage/uploads/` 目录

项目直接使用 `node:sqlite`，因此仅满足 Next.js 自身的最低 Node.js 版本并不够。

## 快速开始

```bash
git clone https://github.com/wuwuwu-lxb/myblog.git
cd myblog
npm ci
cp .env.example .env.local
npm run dev
```

默认地址：

- 首页：`http://localhost:3000`
- 博客：`http://localhost:3000/blog`
- 日记：`http://localhost:3000/diary`
- self-LLM：`http://localhost:3000/self`
- 工作台：`http://localhost:3000/dashboard`

首次访问时会自动创建 `data/selfwiki.sqlite`、执行表结构迁移并写入示例数据。

## 环境配置

所有可用变量都列在 [.env.example](.env.example) 中。生产环境不要提交 `.env.local`，也不要在日志或测试报告中输出密钥。

### 应用与鉴权

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_ALLOWED_LOGIN=wuwuwu-lxb
AUTH_SECRET=
```

创建 GitHub OAuth App 时配置：

- Homepage URL：与 `NEXT_PUBLIC_APP_URL` 一致
- Authorization callback URL：`${NEXT_PUBLIC_APP_URL}/api/auth/github/callback`

`AUTH_SECRET` 必须是随机长字符串。`GITHUB_ALLOWED_LOGIN` 是唯一允许进入后台的 GitHub 登录名。

本地调试且未配置 GitHub OAuth 时，可以临时使用：

```env
ALLOW_DEV_AUTH_BYPASS=1
```

该开关只在非生产环境且完整 OAuth 配置不存在时生效，生产环境必须保持为 `0`。

### self-LLM

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=
LLM_MODEL=
LLM_TEMPERATURE=0.45
LLM_MAX_TOKENS=1400
```

服务请求 `${LLM_BASE_URL}/chat/completions`，上游必须兼容 OpenAI 的流式 Chat Completions 协议。

- 配置 `LLM_API_KEY` 和 `LLM_MODEL` 后调用真实上游。
- 未配置时返回本地 mock 流，但仍会检索 SQLite 中的公开内容。
- 上游失败时，详细异常只记录在服务端，客户端收到通用错误消息。
- 公共聊天默认按客户端 IP 每日限制 30 次。

### giscus 评论

```env
NEXT_PUBLIC_GISCUS_REPO=owner/repo
NEXT_PUBLIC_GISCUS_REPO_ID=
NEXT_PUBLIC_GISCUS_CATEGORY=Announcements
NEXT_PUBLIC_GISCUS_CATEGORY_ID=
```

对应仓库需要开启 Discussions，并安装 giscus GitHub App。

### Tailscale 状态

```env
TAILSCALE_API_TOKEN=
TAILSCALE_TAILNET=
TAILSCALE_OWNER_LOGIN=wuwuwu-lxb@github
TAILSCALE_ONLINE_WINDOW_SECONDS=120
```

未配置 token 或 tailnet 时，首页仍可运行，只是不展示真实设备状态。

## 页面与接口

主要公开页面：

| 路径 | 用途 |
| --- | --- |
| `/` | 首页、统计和访客地图 |
| `/blog` | 公开文章列表 |
| `/blog/[slug]` | 公开文章详情 |
| `/diary` | 公开日记时间线 |
| `/self` | self-LLM 对话 |
| `/assets/[id]` | 上传媒体读取 |

主要公开 API：

| 方法与路径 | 用途 |
| --- | --- |
| `GET /api/status` | 读取在线状态 |
| `GET /api/settings/tagline` | 读取首页文案 |
| `POST /api/visits` | 记录访问事件 |
| `POST /api/chat` | self-LLM SSE 对话 |

以下接口需要登录：

- `/api/entries` 和 `/api/entries/[id]`
- `/api/categories`
- `/api/tags`
- `/api/assets` 和 `/api/assets/[id]`
- `/api/status` 的写入方法
- `/api/settings/tagline` 的写入方法

## 数据与备份

运行数据不会进入 Git：

- 数据库：`data/selfwiki.sqlite`
- SQLite WAL：`data/selfwiki.sqlite-wal`、`data/selfwiki.sqlite-shm`
- 上传文件：`storage/uploads/`

生产备份至少需要包含数据库、上传目录和环境变量文件。应用运行时不要只复制 SQLite 主文件；应使用 SQLite 在线备份机制，或者停服务后一起备份数据库及 WAL 文件。

## 构建与运行

提交或部署前执行：

```bash
npm ci
npm audit
npm run build
```

启动生产构建：

```bash
npm run start
```

生产环境应使用 systemd、Docker 或其他进程管理器保持服务运行，并由 Nginx/Caddy 终止 HTTPS、转发真实客户端 IP。

## 部署顺序

1. 记录当前线上提交和环境配置，备份 SQLite、上传文件和反向代理配置。
2. 在独立 release 目录拉取目标提交并执行 `npm ci`、`npm audit`、`npm run build`。
3. 单独验证 LLM 上游的模型、账户和流式 `/chat/completions` 响应。
4. 切换 release 并重启应用，不在原目录直接覆盖运行中的依赖。
5. 检查首页、文章、媒体、OAuth、后台鉴权和 self-LLM。
6. 观察应用日志和 5xx；异常时切回旧 release，并恢复原环境配置。

本项目目前没有数据库结构升级命令。数据库迁移在应用首次连接时自动执行，因此部署前备份仍是必要步骤。

## 故障排查

### 后台无法登录

检查 OAuth App callback、`NEXT_PUBLIC_APP_URL`、GitHub Client ID/Secret、允许登录名和 `AUTH_SECRET` 是否来自同一套生产配置。

### self-LLM 返回通用错误

查看服务端日志，并从服务器直接验证 `LLM_BASE_URL`、API Key、模型或函数 ID。站点返回 HTTP 200 只表示 SSE 已建立，还需要确认最终收到 `event: done`，而不是 `event: error`。

### 图片记录存在但文件 404

确认 `storage/uploads/` 已随 release 持久化，并且应用用户对该目录有读写权限。不要只迁移 SQLite 数据库。

### 构建阶段 TypeScript 配置解析失败

项目在 `next.config.ts` 中关闭了实验性的 TypeScript CLI 检查路径，以兼容当前 Node.js/TypeScript 工具链。不要在未验证构建的情况下删除该配置。
