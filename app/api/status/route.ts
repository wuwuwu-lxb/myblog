import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createOnlineStatus, getOnlineStatus } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ status: getOnlineStatus() });
}

export async function POST(request: Request) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    message?: string;
  };
  const status = createOnlineStatus(payload.message ?? "");

  if (!status) {
    return NextResponse.json({ error: "状态不能为空。" }, { status: 400 });
  }

  return NextResponse.json({ status }, { status: 201 });
}
