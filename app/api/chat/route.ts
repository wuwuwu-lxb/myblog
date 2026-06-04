import { NextResponse } from "next/server";
import { answerWithMockSelfLlm } from "@/lib/self-llm";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    question?: string;
  };

  const question = payload.question?.trim() ?? "";

  if (!question) {
    return NextResponse.json({ error: "问题不能为空。" }, { status: 400 });
  }

  return NextResponse.json(answerWithMockSelfLlm(question));
}

