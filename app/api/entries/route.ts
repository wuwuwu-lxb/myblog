import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createContent, listContents, type ContentType, type Visibility } from "@/lib/db";

const contentTypes = new Set<ContentType>(["entry", "note", "post", "memory"]);
const visibilities = new Set<Visibility>(["private", "draft", "public"]);

export async function GET() {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  return NextResponse.json({
    contents: listContents(),
  });
}

export async function POST(request: Request) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    type?: ContentType;
    title?: string;
    categoryId?: string;
    summary?: string;
    body?: string;
    tagIds?: string[];
    visibility?: Visibility;
    publishedAt?: string;
    assetIds?: string[];
    coverAssetId?: string;
  };

  const title = payload.title?.trim();
  const body = payload.body?.trim();
  const categoryId = payload.categoryId?.trim();
  const type = payload.type ?? "entry";
  const visibility = payload.visibility ?? "private";

  if (!title || !body) {
    return NextResponse.json({ error: "标题和正文不能为空。" }, { status: 400 });
  }

  if (!categoryId) {
    return NextResponse.json({ error: "必须选择一个分类。" }, { status: 400 });
  }

  if (!contentTypes.has(type)) {
    return NextResponse.json({ error: "内容类型不合法。" }, { status: 400 });
  }

  if (!visibilities.has(visibility)) {
    return NextResponse.json({ error: "可见性不合法。" }, { status: 400 });
  }

  const content = createContent({
    type,
    title,
    categoryId,
    summary: payload.summary,
    body,
    tagIds: payload.tagIds ?? [],
    visibility,
    publishedAt: payload.publishedAt,
    assetIds: payload.assetIds ?? [],
    coverAssetId: payload.coverAssetId,
  });

  return NextResponse.json({ content }, { status: 201 });
}
