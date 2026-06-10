"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, FileText, Send } from "lucide-react";
import { MarkdownPreview } from "@/app/MarkdownPreview";
import type { LlmMeta, LlmMode, PublicLlmSource } from "@/app/client-types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const visitorIdKey = "llm-selfwiki-visitor-id";
const chatStateKey = "llm-selfwiki-chat-state-v1";
const initialMessages: ChatMessage[] = [];

export function SelfChat() {
  const [mode, setMode] = useState<LlmMode>("qa");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [meta, setMeta] = useState<LlmMeta | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [clearFeedback, setClearFeedback] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const isClearingRef = useRef(false);
  const assistantTailRef = useRef("");
  const clearFeedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(chatStateKey);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        mode?: LlmMode;
        messages?: ChatMessage[];
        meta?: LlmMeta | null;
      };

      if (parsed.mode === "qa" || parsed.mode === "chat") {
        setMode(parsed.mode);
      }

      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        setMessages(parsed.messages.slice(-30));
      }

      if (parsed.meta) {
        setMeta(parsed.meta);
      }
    } catch {
      window.localStorage.removeItem(chatStateKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      chatStateKey,
      JSON.stringify({
        mode,
        messages: messages.slice(-30),
        meta,
      }),
    );
  }, [messages, meta, mode]);

  const latestAnswer = useMemo(() => {
    return {
      sources: meta?.sources ?? [],
      recommendations: meta?.recommendations ?? [],
      rateLimit: meta?.rateLimit,
      intent: meta?.intent ?? "answer",
    };
  }, [meta]);
  const hasUserMessages = messages.some((message) => message.role === "user");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();

    if (!trimmed || isSending) {
      return;
    }

    const assistantId = crypto.randomUUID();
    const visitorId = getVisitorId();
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    isClearingRef.current = false;
    assistantTailRef.current = "";

    startTransition(() => {
      setIsSending(true);
      setMeta(null);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", content: trimmed },
      ]);
      setQuestion("");
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode, question: trimmed, visitorId }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => ({ error: "对话失败。" }));
        updateAssistantMessage(assistantId, result.error ?? "对话失败。");
        return;
      }

      await readSseStream(response.body, {
        onMeta: (nextMeta) => setMeta(nextMeta),
        onDelta: (text) => appendAssistantMessage(assistantId, text),
        onError: (error) => updateAssistantMessage(assistantId, error),
      });
    } catch (error) {
      if (isAbortError(error)) {
        if (!isClearingRef.current) {
          updateAssistantMessage(assistantId, "这次回答已中断。");
        }
        return;
      }

      updateAssistantMessage(assistantId, error instanceof Error ? error.message : "对话失败。");
    } finally {
      abortRef.current = null;
      isClearingRef.current = false;
      startTransition(() => {
        setIsSending(false);
      });
    }
  }

  function appendAssistantMessage(id: string, text: string) {
    if (!text) {
      return;
    }

    if (mode === "qa") {
      startTransition(() => {
        setMessages((current) => {
          if (!current.some((message) => message.id === id)) {
            return [...current, { id, role: "assistant", content: text }];
          }

          return current.map((message) =>
            message.id === id ? { ...message, content: message.content + text } : message,
          );
        });
      });
      return;
    }

    const combined = assistantTailRef.current + text;
    const parts = combined.split(/\n+/);
    assistantTailRef.current = parts.pop() ?? "";
    const completeParts = parts.map((part) => part.trim()).filter(Boolean);

    startTransition(() => {
      setMessages((current) => {
        const nextMessages = current.filter((message) => message.id !== id);
        for (const part of completeParts) {
          nextMessages.push({ id: crypto.randomUUID(), role: "assistant", content: part });
        }
        if (assistantTailRef.current.trim()) {
          nextMessages.push({ id, role: "assistant", content: assistantTailRef.current });
        }
        return nextMessages;
      });
    });
  }

  function updateAssistantMessage(id: string, content: string) {
    startTransition(() => {
      setMessages((current) => {
        if (!current.some((message) => message.id === id)) {
          return [...current, { id, role: "assistant", content }];
        }

        return current.map((message) => (message.id === id ? { ...message, content } : message));
      });
    });
  }

  function clearChat() {
    isClearingRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    assistantTailRef.current = "";
    window.localStorage.removeItem(chatStateKey);
    startTransition(() => {
      setMessages(initialMessages);
      setMeta(null);
      setQuestion("");
      setIsSending(false);
      setClearFeedback("已清空");
    });

    if (clearFeedbackTimerRef.current) {
      window.clearTimeout(clearFeedbackTimerRef.current);
    }
    clearFeedbackTimerRef.current = window.setTimeout(() => {
      setClearFeedback("");
    }, 1800);
  }

  return (
    <div className="chat-shell">
      <section className="chat-panel" aria-label="self-LLM 对话">
        <div className="chat-toolbar">
          <div className="mode-tabs" data-mode={mode} aria-label="对话模式">
            <button aria-pressed={mode === "qa"} disabled={hasUserMessages} onClick={() => setMode("qa")} type="button">
              知识问答
            </button>
            <button aria-pressed={mode === "chat"} disabled={hasUserMessages} onClick={() => setMode("chat")} type="button">
              聊天
            </button>
          </div>
          {latestAnswer.rateLimit ? (
            <span className="chat-quota">今日剩余 {latestAnswer.rateLimit.remaining}</span>
          ) : null}
        </div>

        <div className="chat-log">
          {messages.map((message) => (
            <div className={`message ${message.role}`} key={message.id}>
              <span>{message.role === "assistant" ? "wuwuwu" : "you"}</span>
              <MarkdownPreview content={message.content || (message.role === "assistant" && isSending ? "正在整理公开来源..." : "") || ""} />
            </div>
          ))}
        </div>
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            aria-label="提问"
            placeholder="输入内容"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button className="button primary chat-send-button" type="submit" aria-label="发送" disabled={isSending}>
            <Send aria-hidden="true" size={17} />
            {isSending ? "生成中" : "发送"}
          </button>
        </form>
        <section className="chat-recommendations">
          <SourcePanel
            title="推荐文章"
            emptyText="表达推荐文章、随机看看或给我几篇的意图后，这里会出现 1-3 篇文章。"
            items={latestAnswer.recommendations}
            icon="post"
          />
        </section>
      </section>

      <aside className="side-stack">
        <section className="panel chat-actions-panel">
          <button className="button ghost full-width" onClick={clearChat} type="button">
            清空本地对话
          </button>
          {clearFeedback ? <p className="muted chat-clear-feedback">{clearFeedback}</p> : null}
        </section>

        <SourcePanel
          title="本次来源"
          emptyText="还没有检索来源。"
          items={latestAnswer.sources}
          icon="source"
          scrollable
        />
      </aside>
    </div>
  );
}

function SourcePanel({
  title,
  emptyText,
  items,
  icon,
  scrollable = false,
}: {
  title: string;
  emptyText: string;
  items: PublicLlmSource[];
  icon: "source" | "post";
  scrollable?: boolean;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className={`source-list ${scrollable ? "scrollable" : ""}`}>
        {items.map((source) => (
          <article className="source-card" key={source.id}>
            {icon === "post" ? <BookOpenText aria-hidden="true" size={18} /> : <FileText aria-hidden="true" size={18} />}
            <h3>{source.title}</h3>
            <p>{source.summary}</p>
            <div className="source-card-footer">
              <span>{source.category}</span>
              {source.type === "post" ? <Link href={`/blog/${source.slug}`}>打开</Link> : null}
            </div>
          </article>
        ))}
        {items.length === 0 ? <p className="muted">{emptyText}</p> : null}
      </div>
    </section>
  );
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onMeta: (meta: LlmMeta) => void;
    onDelta: (text: string) => void;
    onError: (error: string) => void;
  },
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      handleSseEvent(event, handlers);
    }
  }

  if (buffer.trim()) {
    handleSseEvent(buffer, handlers);
  }
}

function handleSseEvent(
  rawEvent: string,
  handlers: {
    onMeta: (meta: LlmMeta) => void;
    onDelta: (text: string) => void;
    onError: (error: string) => void;
  },
) {
  const eventType = rawEvent.match(/^event:\s*(.+)$/m)?.[1]?.trim();
  const dataText = rawEvent.match(/^data:\s*(.+)$/m)?.[1]?.trim();

  if (!eventType || !dataText) {
    return;
  }

  const data = JSON.parse(dataText) as { text?: string; error?: string } | LlmMeta;

  if (eventType === "meta") {
    handlers.onMeta(data as LlmMeta);
  }

  if (eventType === "delta") {
    handlers.onDelta((data as { text?: string }).text ?? "");
  }

  if (eventType === "error") {
    handlers.onError((data as { error?: string }).error ?? "对话失败。");
  }
}

function getVisitorId() {
  let visitorId = window.localStorage.getItem(visitorIdKey);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    window.localStorage.setItem(visitorIdKey, visitorId);
  }
  return visitorId;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}
