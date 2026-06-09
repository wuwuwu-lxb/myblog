"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { CornerDownLeft, FileText, Send } from "lucide-react";
import type { ContentItem } from "@/app/client-types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function SelfChat() {
  const [question, setQuestion] = useState("");
  const deferredQuestion = useDeferredValue(question);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "我是当前原型里的 self-LLM。你可以问我长期关注什么、这个项目为什么不是普通博客，或者某个主题背后有哪些公开来源。",
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

    startTransition(() => {
      setIsSending(true);
      setMessages((current) => [...current, { role: "user", content: trimmed }]);
      setQuestion("");
    });

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: trimmed }),
    });

    const result = await response.json();
    startTransition(() => {
      setIsSending(false);
    });

    if (!response.ok) {
      startTransition(() => {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: result.error ?? "对话失败。" },
        ]);
      });
      return;
    }

    startTransition(() => {
      setSources(result.sources);
      setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
    });
  }

  return (
    <div className="chat-shell">
      <section className="chat-panel" aria-label="self-LLM 对话">
        <div className="chat-log">
          {messages.map((message, index) => (
            <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
              <span>{message.role === "assistant" ? "self" : "you"}</span>
              {message.content}
            </div>
          ))}
        </div>
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            aria-label="提问"
            placeholder="问：你最近长期关注什么？"
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
                <FileText aria-hidden="true" size={18} />
                <h3>{source.title}</h3>
                <p>{source.summary}</p>
              </article>
            ))}
            {latestAnswer.sources.length === 0 ? <p className="muted">还没有检索来源。</p> : null}
          </div>
          {deferredQuestion ? (
            <div className="query-echo">
              <CornerDownLeft aria-hidden="true" size={15} />
              <span>{deferredQuestion}</span>
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
