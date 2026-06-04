"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import type { ContentItem } from "@/lib/db";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function SelfChat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "你好，我是当前原型里的 self-LLM。现在还没有接真实模型，但已经按“公开资料 + 人格边界 + 来源约束”的方式设计交互。",
    },
  ]);
  const [sources, setSources] = useState<ContentItem[]>([]);
  const [isSending, setIsSending] = useState(false);

  const latestAnswer = useMemo(() => {
    return {
      sources,
    };
  }, [sources]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();

    if (!trimmed) {
      return;
    }

    setIsSending(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setQuestion("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: trimmed }),
    });

    const result = await response.json();
    setIsSending(false);

    if (!response.ok) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.error ?? "对话失败。" },
      ]);
      return;
    }

    setSources(result.sources);
    setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
  }

  return (
    <div className="chat-shell">
      <section className="chat-panel" aria-label="self-LLM 对话">
        <div className="chat-log">
          {messages.map((message, index) => (
            <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
              {message.content}
            </div>
          ))}
        </div>
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            aria-label="提问"
            placeholder="问问这个 AI 分身：这个项目和普通博客有什么不同？"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button className="button primary" type="submit" aria-label="发送" disabled={isSending}>
            <Send aria-hidden="true" size={17} />
            {isSending ? "生成中" : "发送"}
          </button>
        </form>
      </section>

      <aside className="side-stack">
        <section className="panel">
          <h2>回答规则</h2>
          <p>当前原型先展示产品形态。后续真实版本会接入公开内容检索和 LLM API。</p>
          <ul className="status-list">
            <li>
              <span>资料不足时说明不确定</span>
              <strong>必须</strong>
            </li>
            <li>
              <span>尽量附带来源</span>
              <strong>必须</strong>
            </li>
            <li>
              <span>不代表本人做现实承诺</span>
              <strong>必须</strong>
            </li>
          </ul>
        </section>

        <section className="panel">
          <h2>本次来源</h2>
          <div className="source-list">
            {latestAnswer.sources.map((source) => (
              <article className="source-card" key={source.id}>
                <h3>{source.title}</h3>
                <p>{source.summary}</p>
              </article>
            ))}
            {latestAnswer.sources.length === 0 ? <p className="muted">还没有检索来源。</p> : null}
          </div>
        </section>
      </aside>
    </div>
  );
}
