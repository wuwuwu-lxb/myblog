import { NextResponse } from "next/server";
import { recordChatRateLimit } from "@/lib/db";
import { buildLlmContext, normalizeLlmMode, streamSelfLlmAnswer } from "@/lib/self-llm";

type ChatPayload = {
  mode?: string;
  question?: string;
  visitorId?: string;
};

const encoder = new TextEncoder();
const maxQuestionLength = 2000;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ChatPayload | null;
  const question = payload?.question?.trim() ?? "";

  if (!question) {
    return NextResponse.json({ error: "问题不能为空。" }, { status: 400 });
  }

  if (question.length > maxQuestionLength) {
    return NextResponse.json({ error: `问题不能超过 ${maxQuestionLength} 个字符。` }, { status: 400 });
  }

  const bucketKey = getClientIp(request);
  const rateLimit = recordChatRateLimit(bucketKey);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `今天的公开 self-LLM 调用次数已用完，明天再试。`,
        limit: rateLimit.limit,
        resetAt: rateLimit.resetAt,
      },
      { status: 429 },
    );
  }

  const mode = normalizeLlmMode(payload?.mode);
  const meta = {
    ...buildLlmContext(question, mode),
    rateLimit: {
      remaining: rateLimit.remaining,
      limit: rateLimit.limit,
      resetAt: rateLimit.resetAt,
    },
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      sendEvent(controller, "meta", meta);

      try {
        const llmStream = await streamSelfLlmAnswer({
          question,
          mode,
          meta,
          signal: request.signal,
        });

        await pipeLlmStream(llmStream, controller);
        sendEvent(controller, "done", {});
      } catch (error) {
        sendEvent(controller, "error", {
          error: error instanceof Error ? error.message : "LLM 请求失败。",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

async function pipeLlmStream(stream: ReadableStream<Uint8Array>, controller: ReadableStreamDefaultController<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      if (!trimmed.startsWith("data:")) {
        sendEvent(controller, "delta", { text: line });
        continue;
      }

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      const delta = parseOpenAiDelta(payload);
      if (delta) {
        sendEvent(controller, "delta", { text: delta });
      }
    }
  }

  if (buffer.trim() && !buffer.trim().startsWith("data:")) {
    sendEvent(controller, "delta", { text: buffer });
  }
}

function parseOpenAiDelta(payload: string) {
  try {
    const parsed = JSON.parse(payload) as {
      choices?: Array<{
        delta?: {
          content?: string;
        };
      }>;
    };
    return parsed.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

function sendEvent(controller: ReadableStreamDefaultController<Uint8Array>, type: string, data: unknown) {
  controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
}

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}
