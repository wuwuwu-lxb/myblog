import { requireUser } from "@/lib/auth";
import { listContents } from "@/lib/db";
import { AdminNav } from "../AdminNav";
import { ContentManager } from "./ContentManager";

export const dynamic = "force-dynamic";

export default async function ContentsPage() {
  await requireUser();

  return (
    <div className="page">
      <p className="eyebrow">后台</p>
      <h1>内容管理</h1>
      <AdminNav />
      <ContentManager initialContents={listContents()} />
    </div>
  );
}
