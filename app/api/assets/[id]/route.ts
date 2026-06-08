import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { deleteAsset } from "@/lib/db";

type AssetApiRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: AssetApiRouteProps) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const { id } = await params;
  const result = deleteAsset(id);

  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  if (result.reason === "in-use") {
    return NextResponse.json({ error: "这张图片仍被内容使用，不能删除。" }, { status: 409 });
  }

  return NextResponse.json({ error: "图片不存在。" }, { status: 404 });
}
