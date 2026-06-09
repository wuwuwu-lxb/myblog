"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImagePlus, Save, Star, TextCursorInput } from "lucide-react";
import { MarkdownPreview } from "@/app/MarkdownPreview";
import type { ContentItem, ContentType, MediaAsset, TaxonomyItem, Visibility } from "@/app/client-types";

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
  const [publishedAt, setPublishedAt] = useState(toDateTimeLocal(initialContent?.publishedAt ?? new Date().toISOString()));
  const [categoryId, setCategoryId] = useState(initialContent?.categoryId ?? categories[0]?.id ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialContent?.tagIds ?? []);
  const [type, setType] = useState<ContentType>(initialContent?.type ?? "entry");
  const [visibility, setVisibility] = useState<Visibility>(initialContent?.visibility ?? "private");
  const [assetIds, setAssetIds] = useState<string[]>(initialContent?.assets.map((asset) => asset.id) ?? []);
  const [sessionAssetIds, setSessionAssetIds] = useState<string[]>([]);
  const [coverAssetId, setCoverAssetId] = useState(initialContent?.coverAssetId ?? "");
  const [selectedMediaAssetId, setSelectedMediaAssetId] = useState(
    initialContent?.coverAssetId || initialContent?.assets[0]?.id || "",
  );
  const [status, setStatus] = useState(initialContent ? `正在编辑：${initialContent.title}` : "准备记录。");
  const [lastSaved, setLastSaved] = useState<ContentItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const visibleAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          asset.usageScope === "reusable" ||
          assetIds.includes(asset.id) ||
          sessionAssetIds.includes(asset.id) ||
          coverAssetId === asset.id,
      ),
    [assets, assetIds, coverAssetId, sessionAssetIds],
  );
  const selectedMediaAsset =
    visibleAssets.find((asset) => asset.id === selectedMediaAssetId) ?? visibleAssets[0] ?? null;

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

  function toggleCover(asset: MediaAsset) {
    setCoverAssetId((current) => (current === asset.id ? "" : asset.id));
    setAssetIds((current) => (current.includes(asset.id) ? current : [...current, asset.id]));
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
    setSessionAssetIds((current) => [result.asset.id, ...current]);
    setSelectedMediaAssetId(result.asset.id);
    setStatus("图片已上传并选中，默认作为一次性图片。");
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
        publishedAt,
        assetIds,
        coverAssetId,
      }),
    });

    const result = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setStatus(result.error ?? "保存失败。");
      return;
    }

    setLastSaved(result.content);
    setStatus(initialContent ? "已更新内容。" : "已保存到 SQLite。");

    if (!initialContent) {
      setTitle("");
      setSummary("");
      setBody("");
      setPublishedAt(toDateTimeLocal(new Date().toISOString()));
      setSelectedTagIds([]);
      setAssetIds([]);
      setSessionAssetIds([]);
      setCoverAssetId("");
      setSelectedMediaAssetId("");
    }
  }

  const lastSavedHref =
    lastSaved?.type === "post" && lastSaved.visibility === "public"
      ? `/blog/${lastSaved.slug}`
      : lastSaved?.type === "entry" && lastSaved.visibility === "public"
        ? `/diary?date=${lastSaved.updatedAt.slice(0, 10)}`
        : null;

  return (
    <section className="section composer-shell">
      <aside className="panel media-dock">
        <div className="composer-head">
          <div>
            <span className="eyebrow compact">MEDIA</span>
            <h2>媒体</h2>
          </div>
          <label className="icon-action file-icon-action" aria-label="上传图片">
            <ImagePlus aria-hidden="true" size={17} />
            <input accept="image/*" type="file" onChange={handleUpload} />
          </label>
        </div>
        <div className="media-dock-actions">
          <button
            className="asset-action asset-action-primary"
            type="button"
            disabled={!selectedMediaAsset}
            onClick={() => selectedMediaAsset && insertImage(selectedMediaAsset)}
          >
            <TextCursorInput aria-hidden="true" size={13} />
            插入正文
          </button>
          <button
            className="asset-action"
            type="button"
            disabled={!selectedMediaAsset}
            aria-pressed={Boolean(selectedMediaAsset && coverAssetId === selectedMediaAsset.id)}
            onClick={() => selectedMediaAsset && toggleCover(selectedMediaAsset)}
          >
            <Star aria-hidden="true" size={13} />
            {selectedMediaAsset && coverAssetId === selectedMediaAsset.id ? "取消封面" : "设封面"}
          </button>
          <button
            className="asset-action"
            type="button"
            disabled={!selectedMediaAsset}
            onClick={() => selectedMediaAsset && toggleAsset(selectedMediaAsset.id)}
          >
            {selectedMediaAsset && assetIds.includes(selectedMediaAsset.id) ? "取消关联" : "关联本文"}
          </button>
        </div>
        <p className="muted small-copy">
          {isUploading ? "上传中。" : selectedMediaAsset ? "已选择图片，可执行上方操作。" : "选择一张图片。"}
        </p>

        <div className="media-dock-list">
          {visibleAssets.map((asset) => {
            const selected = selectedMediaAsset?.id === asset.id;
            const linked = assetIds.includes(asset.id);
            const isCover = coverAssetId === asset.id;

            return (
              <figure className={`${selected ? "selected" : ""} ${linked ? "linked" : ""} ${isCover ? "cover" : ""}`} key={asset.id}>
                <button
                  className="media-image-button"
                  type="button"
                  title={asset.fileName}
                  onClick={() => setSelectedMediaAssetId(asset.id)}
                >
                  <img src={`/assets/${asset.id}`} alt={asset.alt} />
                </button>
              </figure>
            );
          })}
          {visibleAssets.length === 0 ? <p className="muted">还没有可用图片。</p> : null}
        </div>
      </aside>

      <form className="panel composer-editor" onSubmit={handleSubmit}>
        <div className="composer-head">
          <div>
            <span className="eyebrow compact">WRITE</span>
            <h2>{initialContent ? "编辑内容" : "工作区"}</h2>
          </div>
          <button className="button primary" type="submit" disabled={isSaving || !categoryId}>
            <Save aria-hidden="true" size={17} />
            {isSaving ? "保存中" : initialContent ? "更新" : "保存"}
          </button>
        </div>

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
            <span>发布日期</span>
            <input
              className="input"
              type="datetime-local"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
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

        <label className="block-label editor-body-field">
          <span>正文</span>
          <textarea
            className="textarea composer-textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="支持 Markdown，从左侧媒体栏插入图片。"
            required
          />
        </label>

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

      <aside className="panel live-preview composer-preview">
        <div className="board-header">
          <span>PREVIEW</span>
          <strong>{type}</strong>
        </div>
        <h2>{title || "实时预览"}</h2>
        <div className="module-meta">
          <span>发布 {publishedAt ? publishedAt.slice(0, 10) : "-"}</span>
          <span>修改 {initialContent?.updatedAt.slice(0, 10) ?? "保存后生成"}</span>
          <span>浏览 {initialContent?.viewCount ?? 0}</span>
        </div>
        {coverAssetId ? (
          <div className="preview-cover-wrap">
            <img className="preview-cover" src={`/assets/${coverAssetId}`} alt="文章封面" />
            <button className="asset-action danger" type="button" onClick={() => setCoverAssetId("")}>
              移除封面
            </button>
          </div>
        ) : null}
        {summary ? <p className="lead">{summary}</p> : null}
        <MarkdownPreview content={body} />
      </aside>
    </section>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
