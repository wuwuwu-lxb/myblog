import { searchPublicContent } from "@/lib/db";

export function answerWithMockSelfLlm(question: string) {
  const normalized = question.trim();
  const sources = searchPublicContent(normalized);

  if (!normalized) {
    return {
      answer: "你可以问我关于这个项目、self-LLM、个人知识库或动态博客的问题。",
      sources: [],
    };
  }

  if (sources.length === 0) {
    return {
      answer:
        "当前公开资料里没有足够依据回答这个问题。为了避免幻觉，我先不编造具体经历或观点。后续接入真实模型后，这里会返回更自然的澄清问题。",
      sources: [],
    };
  }

  return {
    answer:
      "基于当前公开资料，我会把这个项目理解为一个个人 AI 分身系统，而不是普通博客。它的重点是把日记、复盘、知识库和公开文章沉淀成可检索的资料，再让 self-LLM 在这些来源约束下回答问题。现在这里仍是原型回复，但来源已经来自 SQLite 中的公开内容。",
    sources,
  };
}

