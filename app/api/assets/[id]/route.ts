import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { deleteAsset, updateAssetUsageScope, type AssetUsageScope } from "@/lib/db";

const usageScopes = new Set<AssetUsageScope>(["inline", "reusable"]);

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

export async function PATCH(request: Request, { params }: AssetApiRouteProps) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json()) as {
    usageScope?: AssetUsageScope;
  };

  if (!payload.usageScope || !usageScopes.has(payload.usageScope)) {
    return NextResponse.json({ error: "媒体复用状态不合法。" }, { status: 400 });
  }

  const asset = updateAssetUsageScope(id, payload.usageScope);

  return asset ? NextResponse.json({ asset }) : NextResponse.json({ error: "图片不存在。" }, { status: 404 });
}
