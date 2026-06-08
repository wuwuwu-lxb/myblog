"use client";

import { useState } from "react";
import Link from "next/link";
import { ImagePlus, Save, TextCursorInput } from "lucide-react";
import { MarkdownPreview } from "@/app/MarkdownPreview";
import type { ContentItem, ContentType, MediaAsset, TaxonomyItem, Visibility } from "@/lib/db";

type DashboardComposerProps = {
  initialContent: ContentItem | null;
  initialAssets: MediaAsset[];
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
};

export function DashboardComposer({ initialContent, initialAssets, categories, tags }: DashboardComposerProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [title, setTitle] = useState(initialContent?.title ?? "");
  const [summary, setSummary] = useState(initialContent?.summary ?? "");
  const [body, setBody] = useState(initialContent?.body ?? "");
  const [categoryId, setCategoryId] = useState(initialContent?.categoryId ?? categories[0]?.id ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialContent?.tagIds ?? []);
  const [type, setType] = useState<ContentType>(initialContent?.type ?? "entry");
  const [visibility, setVisibility] = useState<Visibility>(initialContent?.visibility ?? "private");
  const [assetIds, setAssetIds] = useState<string[]>(initialContent?.assets.map((asset) => asset.id) ?? []);
  const [status, setStatus] = useState(initialContent ? `正在编辑：${initialContent.title}` : "准备记录。");
  const [lastSaved, setLastSaved] = useState<ContentItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function toggleAsset(assetId: string) {
    setAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId],
    );
  }

  function insertImage(asset: MediaAsset) {
    const imageMarkdown = `\n\n![${asset.alt || asset.fileName}](/assets/${asset.id})\n\n`;
    setBody((current) => `${current}${imageMarkdown}`);
    setAssetIds((current) => (current.includes(asset.id) ? current : [...current, asset.id]));
    setStatus("图片已插入正文。");
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setStatus("正在上传图片。");

    const form = new FormData();
    form.append("file", file);

    const response = await fetch("/api/assets", {
      method: "POST",
      body: form,
    });

    const result = await response.json();
    setIsUploading(false);

    if (!response.ok) {
      setStatus(result.error ?? "图片上传失败。");
      return;
    }

    setAssets((current) => [result.asset, ...current]);
    setAssetIds((current) => [result.asset.id, ...current]);
    setStatus("图片已上传并选中。");
    event.target.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("正在保存。");

    const response = await fetch(initialContent ? `/api/entries/${initialContent.id}` : "/api/entries", {
      method: initialContent ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        title,
        categoryId,
        summary,
        body,
        tagIds: selectedTagIds,
        visibility,
        assetIds,
      }),
    });

    const result = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setStatus(result.error ?? "保存失败。");
      return;
    }

    setTitle("");
    setSummary("");
    setBody("");
    setSelectedTagIds([]);
    setAssetIds([]);
    setLastSaved(result.content);
    setStatus(initialContent ? "已更新内容。" : "已保存到 SQLite。");
  }

  const lastSavedHref =
    lastSaved?.type === "post" && lastSaved.visibility === "public"
      ? `/blog/${lastSaved.slug}`
      : lastSaved?.type === "entry" && lastSaved.visibility === "public"
        ? `/diary?date=${lastSaved.updatedAt.slice(0, 10)}`
        : null;

  return (
    <section className="section dashboard-grid">
      <form className="panel" onSubmit={handleSubmit}>
        <h2>{initialContent ? "编辑内容" : "工作区"}</h2>
        <div className="form-grid">
          <label>
            <span>标题</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="写一个标题"
              required
            />
          </label>
          <label>
            <span>类型</span>
            <select className="input" value={type} onChange={(event) => setType(event.target.value as ContentType)}>
              <option value="entry">日记/原始记录</option>
              <option value="note">知识库笔记</option>
              <option value="post">公开文章</option>
              <option value="memory">可公开记忆</option>
            </select>
          </label>
          <label>
            <span>可见性</span>
            <select
              className="input"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
            >
              <option value="private">私有</option>
              <option value="draft">草稿</option>
              <option value="public">公开</option>
            </select>
          </label>
          <label>
            <span>分类</span>
            <select className="input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block-label">
          <span>摘要</span>
          <input
            className="input"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="不填会自动截取正文前 120 字。"
          />
        </label>

        <div className="block-label">
          <span>标签</span>
          <div className="choice-grid">
            {tags.map((tag) => (
              <label className="choice-pill" key={tag.id}>
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={(event) => {
                    setSelectedTagIds((current) =>
                      event.target.checked
                        ? [...current, tag.id]
                        : current.filter((selectedId) => selectedId !== tag.id),
                    );
                  }}
                />
                <span>{tag.name}</span>
              </label>
            ))}
            {tags.length === 0 ? <p className="muted">还没有标签，先去分类和标签管理里创建。</p> : null}
          </div>
        </div>

        <label className="block-label">
          <span>正文</span>
          <textarea
            className="textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="支持 Markdown，也可以从右侧媒体库插入图片。"
            required
          />
        </label>

        <div className="actions">
          <button className="button primary" type="submit" disabled={isSaving || !categoryId}>
            <Save aria-hidden="true" size={17} />
            {isSaving ? "保存中" : initialContent ? "更新内容" : "保存记录"}
          </button>
          <label className="button file-button">
            <ImagePlus aria-hidden="true" size={17} />
            {isUploading ? "上传中" : "上传图片"}
            <input accept="image/*" type="file" onChange={handleUpload} />
          </label>
        </div>
        <div className="save-status">
          <p className="muted">{status}</p>
          {lastSavedHref ? (
            <Link className="text-link" href={lastSavedHref}>
              打开刚保存的公开内容
            </Link>
          ) : lastSaved ? (
            <span className="muted">刚保存的是私有/草稿内容。</span>
          ) : null}
        </div>
      </form>

      <aside className="side-stack">
        <section className="panel live-preview">
          <div className="board-header">
            <span>PREVIEW</span>
            <strong>{type}</strong>
          </div>
          <h2>{title || "实时预览"}</h2>
          {summary ? <p className="lead">{summary}</p> : null}
          <MarkdownPreview content={body} />
        </section>

        <section className="panel">
          <h2>媒体资产</h2>
          <div className="asset-strip media-library">
            {assets.map((asset) => {
              const selected = assetIds.includes(asset.id);

              return (
                <figure className={selected ? "selected" : ""} key={asset.id}>
                  <img src={`/assets/${asset.id}`} alt={asset.alt} />
                  <figcaption>
                    <span>{asset.fileName}</span>
                    <button className="asset-action" type="button" onClick={() => toggleAsset(asset.id)}>
                      {selected ? "已选" : "选择"}
                    </button>
                    <button className="asset-action" type="button" onClick={() => insertImage(asset)}>
                      <TextCursorInput aria-hidden="true" size={13} />
                      插入
                    </button>
                  </figcaption>
                </figure>
              );
            })}
            {assets.length === 0 ? <p className="muted">还没有上传图片。</p> : null}
          </div>
        </section>
      </aside>
    </section>
  );
}
