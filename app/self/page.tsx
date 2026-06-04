import { persona } from "@/lib/content";
import { SelfChat } from "./SelfChat";

export default function SelfPage() {
  return (
    <div className="page">
      <p className="eyebrow">公开 AI 分身</p>
      <h1>self-LLM</h1>
      <p className="lead">
        这个页面是公开对话入口的原型。它未来会读取公开文章、公开笔记、可公开记忆和人格设定，
        再用检索结果约束模型回答，减少幻觉。
      </p>

      <section className="section">
        <SelfChat />
      </section>

      <section className="section grid-3">
        <article className="module-card">
          <h3>人格设定</h3>
          <p>{persona.tone}</p>
        </article>
        <article className="module-card">
          <h3>价值偏好</h3>
          <div className="tag-row">
            {persona.values.map((item) => (
              <span className="tag" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>
        <article className="module-card">
          <h3>知识领域</h3>
          <div className="tag-row">
            {persona.domains.map((item) => (
              <span className="tag" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

