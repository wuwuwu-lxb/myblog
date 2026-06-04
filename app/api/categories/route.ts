import { NextResponse } from "next/server";
import { createCategory, listCategories } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    categories: listCategories(),
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    name?: string;
    description?: string;
  };

  const name = payload.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "分类名称不能为空。" }, { status: 400 });
  }

  return NextResponse.json(
    {
      category: createCategory(name, payload.description ?? ""),
    },
    { status: 201 },
  );
}

