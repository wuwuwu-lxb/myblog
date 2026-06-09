import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ThemeControls } from "./ThemeControls";
import { VisitTracker } from "./VisitTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "llm-selfwiki | public self interface",
  description: "公开人格演示系统、日记、博客和 self-LLM AI 分身",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="brand">
            <span className="brand-avatar" aria-hidden="true" />
            <span>wuwuwu</span>
          </div>
          <nav className="top-nav" aria-label="主导航">
            <Link href="/">主页</Link>
            <Link href="/diary">日记</Link>
            <Link href="/self">跟我对话</Link>
            <Link href="/blog">博客</Link>
            <Link href={user ? "/dashboard" : "/login"}>工作台</Link>
            <ThemeControls />
            {user ? (
              <form action="/api/auth/logout" method="post">
                <button className="nav-button" type="submit">
                  <LogOut aria-hidden="true" size={16} />
                  <span>@{user.login}</span>
                </button>
              </form>
            ) : (
              <Link href="/login">
                <LogIn aria-hidden="true" size={16} />
                <span>登录</span>
              </Link>
            )}
          </nav>
        </header>
        <VisitTracker />
        <main>{children}</main>
      </body>
    </html>
  );
}
