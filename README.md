# llm-selfwiki

个人动态博客、日记复盘系统、LLM 辅助知识库，以及面向公开访问的 self-LLM 个人 AI 分身。

这个项目的目标是运行在一台低配置服务器上的私有网页服务。核心不是普通博客，而是通过长期日记、笔记、文章和知识库，构建一个能够模拟个人表达方式、知识结构和思考偏好的 self-LLM。

公开博客可以先由动态服务直接提供；如果后续需要，也可以把选中的公开内容导出成静态博客，再通过 GitHub 和 Cloudflare Pages 部署。

## 当前阶段

项目目前已经有一个可运行的 Next.js 原型。详细产品说明见 [docs/product-brief.md](docs/product-brief.md)。

## 本地运行

```bash
npm install
npm run dev
```

默认访问：

- 首页：`http://localhost:3000`
- self-LLM 原型：`http://localhost:3000/self`
- 公开博客：`http://localhost:3000/blog`
- 私有工作台原型：`http://localhost:3000/dashboard`

当前 self-LLM 还是 mock 原型，尚未接入真实 LLM，但已经会从 SQLite 中检索公开内容作为来源。

## 当前已实现

- SQLite 本地数据库：`data/selfwiki.sqlite`
- 内容模型：日记/笔记/文章/可公开记忆
- 受控分类系统：一篇内容一个主分类，分类需要先创建
- 受控标签系统：一篇内容多个标签，标签需要先创建
- 可见性：私有/草稿/公开
- 图片上传：保存到 `storage/uploads`
- 上传图片读取路由：`/assets/[id]`
- 内容保存 API：`/api/entries`
- 图片上传 API：`/api/assets`
- 分类管理 API：`/api/categories`
- 标签管理 API：`/api/tags`
- self-LLM mock API：`/api/chat`
- 公开博客从 SQLite 读取公开文章
- 公开博客支持分类页和标签页
- 工作台可以保存内容并上传图片
- 分类/标签管理页：`/dashboard/taxonomy`

## 设计调研

- 产品讨论稿：[docs/product-brief.md](docs/product-brief.md)
- 前端和博客案例调研：[docs/frontend-research.md](docs/frontend-research.md)

本地数据库和上传文件默认不会进入 git。

## 推荐的第一版方向

第一版建议走一个务实的小系统：

- TypeScript 全栈网页应用
- SQLite 数据库
- Markdown/富文本写作体验
- 图片、截图、附件等媒体资产管理
- 私有服务端应用，用来处理日记、复盘、笔记和 LLM 流程
- 公开博客发布，可选择动态访问或静态导出
- 公开 self-LLM 对话服务，基于公开内容和可公开的人格设定回答问题

在 2 核 2G 的服务器上，第一版不建议做大型微服务，也不建议做常驻的复杂 agent。更合适的方式是：一个轻量 Web 服务，加上按需触发的 LLM API 调用。

## 核心模块

- 思绪收集箱和日记
- 每日/每周复盘
- 个人知识库
- LLM 辅助总结、分类和关联
- 博客发布
- self-LLM 人格模拟和公开问答

## 近期需要决定的事情

开始实现前，需要先决定：

1. 技术栈：SvelteKit、Next.js、Nuxt，或者其他方案。
2. 存储方式：SQLite 记录内容和元数据，图片/附件存本地文件或对象存储。
3. 登录方式：密码登录、私有网络访问，还是两者都要。
4. 公开博客：先由动态服务提供，还是未来再做静态导出。
5. LLM 提供商：OpenAI 兼容 API、本地模型，还是两者都支持。
6. self-LLM 的公开边界：只能使用公开内容，还是允许部分半公开记忆。
