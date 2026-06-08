import { Database, FileText, ImagePlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listAssets, listCategories, listContents, listTags } from "@/lib/db";
import { AdminNav } from "./AdminNav";
import { DashboardComposer } from "./DashboardComposer";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    edit?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireUser();

  const { edit } = await searchParams;
  const contents = listContents();
  const assets = listAssets();
  const categories = listCategories();
  const tags = listTags();

  const stats = [
    {
      label: "内容记录",
      value: contents.length,
      icon: FileText,
    },
    {
      label: "媒体资产",
      value: assets.length,
      icon: ImagePlus,
    },
    {
      label: "公开来源",
      value: contents.filter((item) => item.visibility === "public").length,
      icon: Database,
    },
  ];

  return (
    <div className="page">
      <p className="eyebrow">私有工作台原型</p>
      <h1>今天的思绪先落地</h1>
      <p className="lead">
        这里已经接入 SQLite 和图片上传。你保存的公开文章会出现在博客里，也会成为 self-LLM 的检索来源。
      </p>
      <AdminNav />

      <section className="section grid-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article className="module-card" key={item.label}>
              <Icon aria-hidden="true" size={24} />
              <h3>{item.label}</h3>
              <p>{item.value}</p>
            </article>
          );
        })}
      </section>

      <DashboardComposer
        initialAssets={assets}
        initialContent={contents.find((item) => item.id === edit) ?? null}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
