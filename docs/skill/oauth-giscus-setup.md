# GitHub 登录和 giscus 评论配置

## GitHub OAuth 登录

这个项目使用 GitHub OAuth 做单用户登录。公开页面不需要登录，私有工作台和写入 API 需要登录。

## 需要创建的 GitHub OAuth App

在 GitHub 创建 OAuth App：

- Homepage URL：`http://localhost:3000`
- Authorization callback URL：`http://localhost:3000/api/auth/github/callback`

部署到服务器后，把 `http://localhost:3000` 换成真实域名。

## 环境变量

复制示例文件：

```bash
cp .env.example .env.local
```

填写：

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_ALLOWED_LOGIN=wuwuwu-lxb
AUTH_SECRET=
```

说明：

- `GITHUB_ALLOWED_LOGIN` 是允许进入工作台的 GitHub 用户名。
- `AUTH_SECRET` 用随机长字符串，不要提交到 git。
- `.env.local` 已经被 `.gitignore` 忽略。

## giscus 评论

评论系统使用 giscus，它基于 GitHub Discussions。

需要做：

1. 在 GitHub 仓库开启 Discussions。
2. 安装 giscus GitHub App。
3. 在 giscus 配置页面选择仓库和 Discussions 分类。
4. 拿到 `repo id`、`category`、`category id`。

配置：

```env
NEXT_PUBLIC_GISCUS_REPO=wuwuwu-lxb/llm-wiki-blog
NEXT_PUBLIC_GISCUS_REPO_ID=
NEXT_PUBLIC_GISCUS_CATEGORY=
NEXT_PUBLIC_GISCUS_CATEGORY_ID=
```

## 当前代码位置

- 登录页：`app/login/page.tsx`
- GitHub OAuth 跳转：`app/api/auth/github/route.ts`
- GitHub OAuth 回调：`app/api/auth/github/callback/route.ts`
- 退出登录：`app/api/auth/logout/route.ts`
- session 签名：`lib/auth.ts`
- giscus 组件：`app/blog/GiscusComments.tsx`

## 参考

- GitHub OAuth Web flow：`https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps`
- giscus：`https://giscus.app/`

