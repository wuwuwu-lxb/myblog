import { NextResponse } from "next/server";
import { createTag, listTags } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    tags: listTags(),
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    name?: string;
    description?: string;
  };

  const name = payload.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "标签名称不能为空。" }, { status: 400 });
  }

  return NextResponse.json(
    {
      tag: createTag(name, payload.description ?? ""),
    },
    { status: 201 },
  );
}

