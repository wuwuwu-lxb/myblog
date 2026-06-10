import type { Metadata } from "next";
import { ViewTransitions } from "next-view-transitions";
import { getCurrentUser } from "@/lib/auth";
import { DynamicDocumentTitle } from "./DynamicDocumentTitle";
import { TopNav } from "./TopNav";
import { VisitTracker } from "./VisitTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "欢迎来到小唔的小窝",
  description: "唔唔唔的个人动态博客、日记、知识库和 self-LLM AI 分身",
  icons: {
    icon: "/images/avatar.jpg",
    apple: "/images/avatar.jpg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <ViewTransitions>
      <html lang="zh-CN">
        <body>
          <header className="site-header">
            <div className="brand">
              <span className="brand-avatar" aria-hidden="true" />
              <span>唔唔唔</span>
            </div>
            <TopNav userLogin={user?.login ?? null} />
          </header>
          <VisitTracker />
          <DynamicDocumentTitle />
          <main>{children}</main>
        </body>
      </html>
    </ViewTransitions>
  );
}
