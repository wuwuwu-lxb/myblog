export type PersonaTopic = {
  slug: string;
  title: string;
  thesis: string;
  signal: string;
  maturity: "forming" | "stable" | "active";
  accent: string;
  questions: string[];
};

export type PersonaMetric = {
  label: string;
  value: string;
  note: string;
};

export const personaSnapshot = {
  name: "Wu's public self",
  role: "公开人格演示系统",
  headline: "一个正在把日记、学习和观点训练成可交互人格的人。",
  description:
    "这里不是文章橱窗，而是一个持续更新的公开人格界面：日记、博客、公开来源、回答边界和 self-LLM 会一起说明我是谁、我在关注什么、我如何形成判断。",
  currentState: "MVP 阶段：先让人格展示成立，再接入更完整的 RAG、日记时间线和内部复盘工作流。",
};

export const personaMetrics: PersonaMetric[] = [
  {
    label: "公开状态",
    value: "可对话",
    note: "self-LLM 先基于公开内容检索回答",
  },
  {
    label: "内容重心",
    value: "人格",
    note: "文章是证据，不是主页主角",
  },
  {
    label: "更新方向",
    value: "日记",
    note: "以后接时间线、观点演化和学习复盘",
  },
];

export const personaTopics: PersonaTopic[] = [
  {
    slug: "self-llm",
    title: "Self-LLM 与人格建模",
    thesis: "AI 分身不应该只是聊天框，而应该是有来源、有边界、能解释自身依据的公开人格接口。",
    signal: "核心能力",
    maturity: "active",
    accent: "ink",
    questions: ["这个人与普通博客作者有什么不同？", "哪些回答必须引用来源？", "如何减少人格模型幻觉？"],
  },
  {
    slug: "knowledge-operating-system",
    title: "个人知识操作系统",
    thesis: "日记、笔记、项目记录和文章应该进入同一个知识循环：输入、整理、复盘、公开、被 self-LLM 引用。",
    signal: "系统骨架",
    maturity: "forming",
    accent: "green",
    questions: ["哪些内容适合公开？", "知识库和博客的边界在哪里？", "主题如何从碎片中长出来？"],
  },
  {
    slug: "learning-review",
    title: "学习规划与复盘",
    thesis: "学习不是收藏资料，而是把卡点、计划、复盘和输出连起来，让长期问题能被持续追踪。",
    signal: "后续工作流",
    maturity: "forming",
    accent: "amber",
    questions: ["最近学习上最大的阻力是什么？", "复盘如何变成知识来源？", "如何避免计划失真？"],
  },
  {
    slug: "engineering-taste",
    title: "极客精神与工程审美",
    thesis: "工具应该能被长期使用、持续改造，并且保留一种个人化的工程气质，而不是只完成通用功能。",
    signal: "表达方式",
    maturity: "stable",
    accent: "red",
    questions: ["为什么要自己搭系统？", "怎样的前端不算模板化？", "工程和表达如何合在一起？"],
  },
];

export const interfacePrinciples = [
  "回答先承认来源范围，再给判断",
  "没有公开证据时明确不确定",
  "首页展示人格状态，不展示普通文章流",
  "日记展示时间线，不替代标签系统",
  "后台服务维护工作流，公开侧只展示整理后的人格",
];

export function getPersonaTopic(slug: string) {
  return personaTopics.find((topic) => topic.slug === slug) ?? null;
}

export function getMaturityLabel(maturity: PersonaTopic["maturity"]) {
  const labels: Record<PersonaTopic["maturity"], string> = {
    active: "活跃形成中",
    forming: "正在成型",
    stable: "相对稳定",
  };

  return labels[maturity];
}
