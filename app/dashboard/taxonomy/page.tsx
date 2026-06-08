import { requireUser } from "@/lib/auth";
import { listCategories, listTags } from "@/lib/db";
import { AdminNav } from "../AdminNav";
import { TaxonomyManager } from "./TaxonomyManager";

export const dynamic = "force-dynamic";

export default async function TaxonomyPage() {
  await requireUser();

  return (
    <div className="page">
      <p className="eyebrow">分类和标签管理</p>
      <h1>先建库，再归档</h1>
      <p className="lead">
        分类和标签不再自由输入。先在这里创建受控词表，写内容时只能从已有分类和标签里选择，避免长期变乱。
      </p>
      <AdminNav />

      <TaxonomyManager initialCategories={listCategories()} initialTags={listTags()} />
    </div>
  );
}
