import { readFileSync } from "node:fs";
import { persona } from "@/lib/content";
import { getContentById, searchPublicContentWithScores, type ContentItem, type ContentType } from "@/lib/db";

export type LlmMode = "qa" | "chat";
export type LlmIntent = "answer" | "recommend" | "mixed";

export type PublicLlmSource = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string[];
  publishedAt: string;
  score: number;
};

export type LlmMeta = {
  mode: LlmMode;
  intent: LlmIntent;
  sources: PublicLlmSource[];
  recommendations: PublicLlmSource[];
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

const defaultBaseUrl = "https://api.openai.com/v1";
const personaDir = "/home/wuwuwu/weclone/persona";
const fallbackAnswer =
  "当前还没有配置真实 LLM，所以我先只能基于公开来源做检索说明。配置 LLM_API_KEY 和 LLM_MODEL 后，这里会变成流式回答。";

export function normalizeLlmMode(input: unknown): LlmMode {
  return input === "chat" ? "chat" : "qa";
}

export function detectLlmIntent(question: string): LlmIntent {
  const normalized = question.toLowerCase();
  const asksRecommendation = /推荐|随便.*看|随机|几篇|读什么|文章.*看看|看看.*文章|给我.*文章/.test(normalized);
  const asksAnswer = /为什么|怎么|如何|是什么|解释|分析|看法|观点|总结|问|聊/.test(normalized);

  if (asksRecommendation && asksAnswer) {
    return "mixed";
  }

  return asksRecommendation ? "recommend" : "answer";
}

export function buildLlmContext(question: string, mode: LlmMode): LlmMeta {
  const intent = detectLlmIntent(question);
  const sourceLimit = intent === "recommend" ? 3 : 5;
  const sourceResults = searchPublicContentWithScores(question, { limit: sourceLimit });
  const recommendationResults =
    intent === "recommend" || intent === "mixed"
      ? selectRecommendations(question)
      : [];

  return {
    mode,
    intent,
    sources: sourceResults.map(({ item, score }) => toPublicSource(item, score)),
    recommendations: recommendationResults.map(({ item, score }) => toPublicSource(item, score)),
  };
}

export function getLlmConfig(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim();

  if (!apiKey || !model) {
    return null;
  }

  return {
    apiKey,
    model,
    baseUrl: (process.env.LLM_BASE_URL?.trim() || defaultBaseUrl).replace(/\/$/, ""),
    temperature: readNumberEnv("LLM_TEMPERATURE", 0.4),
    maxTokens: Math.round(readNumberEnv("LLM_MAX_TOKENS", 1200)),
  };
}

export async function streamSelfLlmAnswer(input: {
  question: string;
  mode: LlmMode;
  meta: LlmMeta;
  signal?: AbortSignal;
}) {
  const config = getLlmConfig();

  if (!config) {
    return createMockStream(input.question, input.meta);
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: buildPromptMessages(input.question, input.mode, input.meta),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    }),
    signal: input.signal,
  });

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `LLM 请求失败：${response.status}`);
  }

  return response.body;
}

function buildPromptMessages(question: string, mode: LlmMode, meta: LlmMeta): ChatMessage[] {
  const sourceText = meta.sources.length
    ? meta.sources.map((source, index) => formatSource(index + 1, source)).join("\n\n")
    : "没有检索到足够公开来源。";
  const recommendationText = meta.recommendations.length
    ? meta.recommendations.map((source, index) => formatSource(index + 1, source)).join("\n\n")
    : "没有候选推荐文章。";

  return [
    {
      role: "system",
      content: [
        mode === "chat" ? buildChatPersonaPrompt() : buildQaSystemPrompt(),
        "你拥有一个受控的网页读取能力：系统已经把和问题最相关的公开文章、日记、note、memory 正文片段放在下方。你必须优先阅读这些片段再回答。",
        "如果片段不足以回答，就说公开资料不足；不要假装读过没有给出的内容。",
        "回答可以使用 Markdown，包括列表、引用和代码块。",
        meta.intent === "recommend" || meta.intent === "mixed"
          ? "用户有文章推荐意图：推荐 1-3 篇文章，说明推荐理由和适合阅读场景。"
          : "用户没有明确要求推荐文章时，不要强行推荐文章。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `用户问题：${question}`,
        `意图：${meta.intent}`,
        "公开来源：",
        sourceText,
        "候选推荐文章：",
        recommendationText,
      ].join("\n\n"),
    },
  ];
}

function selectRecommendations(question: string) {
  const wantsRandom = /随机|随便|任意/.test(question);
  const results = searchPublicContentWithScores(question, { type: "post", limit: 8 });

  if (!wantsRandom) {
    return results.slice(0, 3);
  }

  return shuffle(results).slice(0, 3);
}

function toPublicSource(item: ContentItem, score: number): PublicLlmSource {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    category: item.category,
    tags: item.tags,
    publishedAt: item.publishedAt,
    score: Number(score.toFixed(2)),
  };
}

function formatSource(index: number, source: PublicLlmSource) {
  const item = getContentById(source.id);
  const excerpt = item?.visibility === "public" ? createContentExcerpt(item.body) : "";

  return [
    `[${index}] ${source.title}`,
    `类型：${source.type}`,
    `分类：${source.category}`,
    `标签：${source.tags.join("、") || "无"}`,
    `摘要：${source.summary || "无摘要"}`,
    `链接：/blog/${source.slug}`,
    `正文片段：${excerpt || "无正文片段"}`,
  ].join("\n");
}

function buildQaSystemPrompt() {
  return [
    `你是 ${persona.name}，一个公开 self-LLM 的知识问答模式。`,
    persona.intro,
    `语气：${persona.tone}`,
    `价值观：${persona.values.join("、")}`,
    `领域：${persona.domains.join("、")}`,
    `边界：${persona.boundaries.join("；")}`,
    "当前模式是知识问答：专业、准确、结构化。先给结论，再给依据。",
    "你可以说明自己是基于公开资料的 AI 分身，不要冒充现实本人做承诺。",
  ].join("\n");
}

function buildChatPersonaPrompt() {
  const knowledge = readPersonaFile("persona_knowledge_base.md", 5200);
  const stylePrompt = readPersonaFile("system_prompt.txt", 900);

  return [
    knowledge ? `人格知识库：\n${knowledge}` : "",
    stylePrompt || `你是唔唔唔，表达直接、真诚、偶尔自嘲。`,
    "当前模式是聊天：更多模仿唔唔唔的性格和表达方式，回复可以短一点、自然一点。",
    "但这是公开 self-LLM 服务，不能编造没有来源的具体经历；涉及事实时仍然要受公开来源约束。",
  ].filter(Boolean).join("\n\n");
}

function readPersonaFile(fileName: string, maxLength: number) {
  try {
    return readFileSync(`${personaDir}/${fileName}`, "utf8").trim().slice(0, maxLength);
  } catch {
    return "";
  }
}

function createContentExcerpt(body: string) {
  return body
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1800);
}

function createMockStream(question: string, meta: LlmMeta) {
  const recommendations = meta.recommendations.length
    ? `\n\n推荐文章：${meta.recommendations.map((item) => `《${item.title}》`).join("、")}`
    : "";
  const sources = meta.sources.length
    ? `\n\n检索到的公开来源：${meta.sources.map((item) => `《${item.title}》`).join("、")}`
    : "\n\n当前公开资料不足，我不会编造没有来源的内容。";
  const text = `${fallbackAnswer}${sources}${recommendations}\n\n你的问题是：${question}`;
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function readNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function shuffle<T>(items: T[]) {
  const copied = [...items];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[target]] = [copied[target], copied[index]];
  }
  return copied;
}
