"use client";

import { useState } from "react";
import { Radio, Send } from "lucide-react";
import type { OnlineStatus } from "@/app/client-types";

type OnlineStatusPublisherProps = {
  initialStatus: OnlineStatus | null;
};

export function OnlineStatusPublisher({ initialStatus }: OnlineStatusPublisherProps) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function publishStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback("正在发布状态。");

    const response = await fetch("/api/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    const result = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setFeedback(result.error ?? "状态发布失败。");
      return;
    }

    setStatus(result.status);
    setMessage("");
    setFeedback("状态已发布，24 小时后自动过期。");
  }

  return (
    <section className="section panel status-publisher">
      <div className="manager-head">
        <div>
          <p className="eyebrow compact">
            <Radio aria-hidden="true" size={13} />
            在线状态
          </p>
          <h2>发布当前状态</h2>
        </div>
        {status ? <span className="tag">过期 {status.expiresAt.slice(5, 16).replace("T", " ")}</span> : null}
      </div>
      <form className="status-form" onSubmit={publishStatus}>
        <input
          className="input"
          maxLength={120}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="例如：在线写代码 / 正在学习 / 服务器维护中"
          value={message}
        />
        <button className="button primary" disabled={isSaving || !message.trim()} type="submit">
          <Send aria-hidden="true" size={16} />
          发布
        </button>
      </form>
      {status ? <p className="muted">当前状态：{status.message}</p> : <p className="muted">当前没有公开状态。</p>}
      {feedback ? <p className="muted">{feedback}</p> : null}
    </section>
  );
}
