"use client";

import { useState } from "react";
import { Radio, Send, X } from "lucide-react";
import type { OnlineStatus } from "@/app/client-types";

type OnlineStatusPublisherProps = {
  initialStatus: OnlineStatus | null;
  initialTagline: string;
};

export function OnlineStatusPublisher({ initialStatus, initialTagline }: OnlineStatusPublisherProps) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [tagline, setTagline] = useState(initialTagline);
  const [feedback, setFeedback] = useState("");
  const [taglineFeedback, setTaglineFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTagline, setIsSavingTagline] = useState(false);

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

  async function clearStatus() {
    setIsSaving(true);
    setFeedback("");

    const response = await fetch("/api/status", {
      method: "DELETE",
    });
    const result = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setFeedback(result.error ?? "状态取消失败。");
      return;
    }

    setStatus(null);
    setFeedback("状态已取消。");
  }

  async function saveTagline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingTagline(true);
    setTaglineFeedback("正在保存。");

    const response = await fetch("/api/settings/tagline", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: tagline }),
    });
    const result = await response.json();
    setIsSavingTagline(false);

    if (!response.ok) {
      setTaglineFeedback(result.error ?? "保存失败。");
      return;
    }

    setTagline(result.setting.value);
    setTaglineFeedback("首页副标题已更新。");
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
      <div className="status-editor-grid">
        <div>
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
          {status ? (
            <button className="button ghost" disabled={isSaving} onClick={clearStatus} type="button">
              <X aria-hidden="true" size={16} />
              取消状态
            </button>
          ) : null}
          {feedback ? <p className="muted">{feedback}</p> : null}
        </div>

        <div>
          <form className="status-form" onSubmit={saveTagline}>
            <input
              className="input"
              maxLength={160}
              onChange={(event) => setTagline(event.target.value)}
              placeholder="首页副标题"
              value={tagline}
            />
            <button className="button primary" disabled={isSavingTagline || !tagline.trim()} type="submit">
              保存
            </button>
          </form>
          <p className="muted">首页个人卡片副标题。</p>
          {taglineFeedback ? <p className="muted">{taglineFeedback}</p> : null}
        </div>
      </div>
    </section>
  );
}
