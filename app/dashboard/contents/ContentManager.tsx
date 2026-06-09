"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ContentListItem, ContentType, Visibility } from "@/app/client-types";

type ContentManagerProps = {
  initialContents: ContentListItem[];
};

export function ContentManager({ initialContents }: ContentManagerProps) {
  const [contents, setContents] = useState(initialContents);
  const [contentFilter, setContentFilter] = useState<"all" | ContentType>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | Visibility>("all");
  const [status, setStatus] = useState("");

  const filteredContents = useMemo(
    () =>
      contents.filter(
        (item) =>
          (contentFilter === "all" || item.type === contentFilter) &&
          (visibilityFilter === "all" || item.visibility === visibilityFilter),
      ),
    [contents, contentFilter, visibilityFilter],
  );

  async function changeVisibility(item: ContentListItem, nextVisibility: Visibility) {
    const response = await fetch(`/api/entries/${item.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ visibility: nextVisibility }),
    });
    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error ?? "可见性更新失败。");
      return;
    }

    setContents((current) => current.map((content) => (content.id === item.id ? result.content : content)));
    setStatus(`已更新可见性：${result.content.title}`);
  }

  async function deleteEntry(item: ContentListItem) {
    if (!window.confirm(`确认删除「${item.title}」？`)) {
      return;
    }

    const response = await fetch(`/api/entries/${item.id}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error ?? "删除失败。");
      return;
    }

    setContents((current) => current.filter((content) => content.id !== item.id));
    setStatus(`已删除：${item.title}`);
  }

  return (
    <section className="section panel content-manager">
      <div className="manager-head">
        <h2>内容管理</h2>
        <div className="manager-filters">
          <select className="input" value={contentFilter} onChange={(event) => setContentFilter(event.target.value as typeof contentFilter)}>
            <option value="all">全部类型</option>
            <option value="entry">日记</option>
            <option value="note">笔记</option>
            <option value="post">文章</option>
            <option value="memory">记忆</option>
          </select>
          <select className="input" value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as typeof visibilityFilter)}>
            <option value="all">全部可见性</option>
            <option value="private">私有</option>
            <option value="draft">草稿</option>
            <option value="public">公开</option>
          </select>
        </div>
      </div>

      <div className="content-table">
        {filteredContents.map((item) => (
          <article className="content-row" key={item.id}>
            <div>
              <div className="module-meta">
                <span>{item.type}</span>
                <span>{item.category}</span>
                <span>发布 {item.publishedAt.slice(0, 10)}</span>
                <span>改 {item.updatedAt.slice(0, 10)}</span>
                <span>浏览 {item.viewCount}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </div>
            <div className="row-actions">
              <select
                className="input compact-select"
                value={item.visibility}
                onChange={(event) => void changeVisibility(item, event.target.value as Visibility)}
              >
                <option value="private">私有</option>
                <option value="draft">草稿</option>
                <option value="public">公开</option>
              </select>
              <a className="icon-action" href={`/dashboard?edit=${item.id}`} aria-label="编辑">
                <Pencil aria-hidden="true" size={16} />
              </a>
              <button className="icon-action danger" type="button" onClick={() => deleteEntry(item)} aria-label="删除">
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </div>
          </article>
        ))}
        {filteredContents.length === 0 ? <p className="muted">没有符合筛选条件的内容。</p> : null}
      </div>
      {status ? <p className="muted">{status}</p> : null}
    </section>
  );
}
