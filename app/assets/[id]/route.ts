import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAsset } from "@/lib/db";

const uploadRoot = path.resolve(process.cwd(), "storage", "uploads");

type AssetRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: AssetRouteProps) {
  const { id } = await params;
  const asset = getAsset(id);

  if (!asset) {
    return NextResponse.json({ error: "资源不存在。" }, { status: 404 });
  }

  const assetPath = path.resolve(asset.storagePath);

  if (!assetPath.startsWith(`${uploadRoot}${path.sep}`)) {
    return NextResponse.json({ error: "资源路径不合法。" }, { status: 404 });
  }

  try {
    await stat(assetPath);
  } catch {
    return NextResponse.json({ error: "文件不存在。" }, { status: 404 });
  }

  const stream = createReadStream(assetPath);

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
