import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import {
  deleteContent,
  updateContent,
  updateContentVisibility,
  type ContentType,
  type Visibility,
} from "@/lib/db";

const contentTypes = new Set<ContentType>(["entry", "note", "post", "memory"]);
const visibilities = new Set<Visibility>(["private", "draft", "public"]);

type EntryRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: EntryRouteProps) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json()) as {
    type?: ContentType;
    title?: string;
    categoryId?: string;
    summary?: string;
    body?: string;
    tagIds?: string[];
    visibility?: Visibility;
    assetIds?: string[];
  };

  if (payload.visibility && Object.keys(payload).length === 1) {
    if (!visibilities.has(payload.visibility)) {
      return NextResponse.json({ error: "可见性不合法。" }, { status: 400 });
    }

    const content = updateContentVisibility(id, payload.visibility);
    return content
      ? NextResponse.json({ content })
      : NextResponse.json({ error: "内容不存在。" }, { status: 404 });
  }

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

  const content = updateContent(id, {
    type,
    title,
    categoryId,
    summary: payload.summary,
    body,
    tagIds: payload.tagIds ?? [],
    visibility,
    assetIds: payload.assetIds ?? [],
  });

  return content
    ? NextResponse.json({ content })
    : NextResponse.json({ error: "内容不存在。" }, { status: 404 });
}

export async function DELETE(_request: Request, { params }: EntryRouteProps) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = deleteContent(id);

  return deleted
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "内容不存在。" }, { status: 404 });
}
