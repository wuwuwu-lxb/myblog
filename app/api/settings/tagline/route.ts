import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getSiteSetting, upsertSiteSetting } from "@/lib/db";

const taglineKey = "home.tagline";
const defaultTagline = "Coding the world.";

export async function GET() {
  return NextResponse.json({ setting: getSiteSetting(taglineKey, defaultTagline) });
}

export async function POST(request: Request) {
  if (!(await requireApiUser())) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    value?: string;
  };
  const value = payload.value?.trim() || defaultTagline;

  return NextResponse.json({ setting: upsertSiteSetting(taglineKey, value) });
}
