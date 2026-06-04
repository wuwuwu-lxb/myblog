import Link from "next/link";
import { BrainCircuit, Images, NotebookPen, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { persona } from "@/lib/content";
import { listContents } from "@/lib/db";

const modules = [
  {
    title: "思绪和日记",
    desc: "每天的原始记录、图片、截图和复盘材料先进入私有工作台。",
    icon: NotebookPen,
  },
  {
    title: "个人知识库",
    desc: "把长期记录整理成可检索、可引用、可继续生长的知识资产。",
    icon: BrainCircuit,
  },
  {
    title: "self-LLM",
    desc: "基于公开资料和人格设定回答访客问题，尽量减少无来源幻觉。",
    icon: Sparkles,
  },
];

export default function HomePage() {
  const publicContent = listContents({ visibility: "public" });

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">个人动态博客 + self-LLM</p>
          <h1>把长期写作变成一个可以对话的自己</h1>
          <p className="lead">
            llm-selfwiki 不是普通博客。它把日记、复盘、笔记、文章、图片和项目记录组织成个人知识系统，再通过
            self-LLM 对外表达你的知识结构、观点和风格。
          </p>
          <div className="actions">
            <Link className="button primary" href="/self">
              进入 self-LLM
            </Link>
            <Link className="button" href="/dashboard">
              打开工作台
            </Link>
          </div>
        </div>

        <div className="system-preview" aria-label="系统模块预览">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <article className="module-card" key={item.title}>
                <Icon aria-hidden="true" size={24} />
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section grid-3" aria-label="系统原则">
        <article className="module-card">
          <ShieldCheck aria-hidden="true" size={24} />
          <h3>有边界</h3>
          <p>self-LLM 可以模拟表达方式，但不应该编造没有来源的经历或承诺。</p>
        </article>
        <article className="module-card">
          <Images aria-hidden="true" size={24} />
          <h3>支持媒体资产</h3>
          <p>内容不只包括 Markdown，还包括图片、截图和附件等长期资料。</p>
        </article>
        <article className="module-card">
          <Radio aria-hidden="true" size={24} />
          <h3>动态优先</h3>
          <p>先由服务器直接提供私有系统和公开博客，后续再按需要增加静态导出。</p>
        </article>
      </section>

      <section className="section dashboard-grid">
        <div>
          <h2>公开知识来源</h2>
          <div className="article-list">
            {publicContent.map((item) => (
              <Link className="article-card" href={`/blog/${item.slug}`} key={item.id}>
                <div className="module-meta">
                  <span>{item.type}</span>
                  <span>{item.category}</span>
                  <span>{item.updatedAt}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
        <aside className="panel">
          <h2>{persona.name}</h2>
          <p>{persona.intro}</p>
          <h3>当前语气</h3>
          <p>{persona.tone}</p>
          <h3>边界</h3>
          <ul className="status-list">
            {persona.boundaries.map((item) => (
              <li key={item}>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
