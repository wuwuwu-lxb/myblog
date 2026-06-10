import { Database, FileText, ImagePlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getContentById, getDashboardStats, getOnlineStatus, getSiteSetting, listCategories, listComposerAssets, listTags } from "@/lib/db";
import { AdminNav } from "./AdminNav";
import { DashboardComposer } from "./DashboardComposer";
import { OnlineStatusPublisher } from "./OnlineStatusPublisher";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    edit?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireUser();

  const { edit } = await searchParams;
  const editingContent = edit ? getContentById(edit) : null;
  const assets = listComposerAssets(editingContent?.id);
  const categories = listCategories();
  const tags = listTags();
  const dashboardStats = getDashboardStats();
  const onlineStatus = getOnlineStatus();
  const tagline = getSiteSetting("home.tagline", "Coding the world.").value;

  const stats = [
    {
      label: "内容记录",
      value: dashboardStats.contentCount,
      icon: FileText,
    },
    {
      label: "媒体资产",
      value: dashboardStats.assetCount,
      icon: ImagePlus,
    },
    {
      label: "公开来源",
      value: dashboardStats.publicSourceCount,
      icon: Database,
    },
  ];

  return (
    <div className="page">
      <p className="eyebrow">私有工作台原型</p>
      <h1>今天的思绪先落地</h1>
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

      <OnlineStatusPublisher initialStatus={onlineStatus} initialTagline={tagline} />

      <DashboardComposer
        initialAssets={assets}
        initialContent={editingContent}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
