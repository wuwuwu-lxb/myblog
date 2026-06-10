"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { ThemeControls } from "./ThemeControls";

type TopNavProps = {
  userLogin: string | null;
};

const items = [
  { href: "/", label: "主页", match: (pathname: string) => pathname === "/" },
  { href: "/diary", label: "日记", match: (pathname: string) => pathname.startsWith("/diary") },
  { href: "/self", label: "跟我对话", match: (pathname: string) => pathname.startsWith("/self") },
  { href: "/blog", label: "博客", match: (pathname: string) => pathname.startsWith("/blog") },
];

export function TopNav({ userLogin }: TopNavProps) {
  const pathname = usePathname();
  const workbenchHref = userLogin ? "/dashboard" : "/login";
  const workbenchActive = pathname.startsWith("/dashboard") || pathname.startsWith("/login");

  return (
    <nav className="top-nav" aria-label="主导航">
      {items.map((item) => (
        <Link aria-current={item.match(pathname) ? "page" : undefined} href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
      <Link aria-current={workbenchActive ? "page" : undefined} href={workbenchHref}>
        工作台
      </Link>
      <ThemeControls />
      {userLogin ? (
        <form action="/api/auth/logout" method="post">
          <button className="nav-button" type="submit">
            <LogOut aria-hidden="true" size={16} />
            <span>@{userLogin}</span>
          </button>
        </form>
      ) : (
        <Link href="/login">
          <LogIn aria-hidden="true" size={16} />
          <span>登录</span>
        </Link>
      )}
    </nav>
  );
}
