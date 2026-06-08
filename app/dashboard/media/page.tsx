import { requireUser } from "@/lib/auth";
import { listAssets } from "@/lib/db";
import { AdminNav } from "../AdminNav";
import { MediaManager } from "./MediaManager";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  await requireUser();

  return (
    <div className="page">
      <p className="eyebrow">后台</p>
      <h1>媒体管理</h1>
      <AdminNav />
      <MediaManager initialAssets={listAssets()} />
    </div>
  );
}
