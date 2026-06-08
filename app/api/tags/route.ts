import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createTag, deleteTags, listTags } from "@/lib/db";

export async function GET() {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  return NextResponse.json({
    tags: listTags(),
  });
}

export async function POST(request: Request) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    name?: string;
    names?: string[];
    description?: string;
  };

  const names = (payload.names ?? [payload.name ?? ""])
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length === 0) {
    return NextResponse.json({ error: "标签名称不能为空。" }, { status: 400 });
  }

  const tags = names.map((name) => createTag(name, payload.description ?? ""));

  return NextResponse.json(
    {
      tag: tags[0],
      tags,
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    ids?: string[];
  };

  const deleted = deleteTags(payload.ids ?? []);

  return NextResponse.json({
    deleted,
    tags: listTags(),
  });
}
