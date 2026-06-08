import Link from "next/link";

const adminLinks = [
  { href: "/dashboard", label: "写作" },
  { href: "/dashboard/contents", label: "内容" },
  { href: "/dashboard/media", label: "媒体" },
  { href: "/dashboard/taxonomy", label: "分类标签" },
];

export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="后台导航">
      {adminLinks.map((link) => (
        <Link href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
