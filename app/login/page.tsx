import Link from "next/link";
import { KeyRound, LockKeyhole } from "lucide-react";
import { getCurrentUser, isAuthConfigured, isDevAuthBypassEnabled } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "not-configured": "GitHub 登录还没有配置环境变量。",
  "invalid-state": "登录状态校验失败，请重新登录。",
  token: "GitHub token 获取失败。",
  user: "GitHub 用户信息获取失败。",
  forbidden: "这个 GitHub 账号没有访问权限。",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const { error } = await searchParams;
  const devBypass = isDevAuthBypassEnabled();

  return (
    <div className="page auth-page">
      <section className="auth-card">
        <LockKeyhole aria-hidden="true" size={30} />
        <h1>登录工作台</h1>
        <p>
          私有写作、分类管理、图片上传和内容发布需要登录。公开博客和 self-LLM 仍然可以直接访问。
        </p>

        {user ? (
          <div className="actions">
            <Link className="button primary" href="/dashboard">
              {devBypass ? "开发模式进入工作台" : "进入工作台"}
            </Link>
            {!devBypass ? (
              <form action="/api/auth/logout" method="post">
                <button className="button" type="submit">
                  退出登录
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="actions">
            <Link className={`button primary ${isAuthConfigured() ? "" : "disabled"}`} href="/api/auth/github">
              <KeyRound aria-hidden="true" size={18} />
              使用 GitHub 登录
            </Link>
          </div>
        )}

        {error ? <p className="auth-error">{errorMessages[error] ?? "登录失败。"}</p> : null}
        {devBypass ? (
          <p className="muted">当前是本地开发免登录模式。部署到生产环境后仍然需要配置 GitHub OAuth。</p>
        ) : !isAuthConfigured() ? (
          <p className="muted">
            需要配置 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`GITHUB_ALLOWED_LOGIN`、`AUTH_SECRET` 和
            `NEXT_PUBLIC_APP_URL`。
          </p>
        ) : null}
      </section>
    </div>
  );
}
