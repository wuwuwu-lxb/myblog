import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getAsset } from "@/lib/db";

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

  try {
    await stat(asset.storagePath);
  } catch {
    return NextResponse.json({ error: "文件不存在。" }, { status: 404 });
  }

  const stream = createReadStream(asset.storagePath);

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
