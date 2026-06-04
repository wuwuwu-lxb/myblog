"use client";

import { useMemo, useState } from "react";
import { ImagePlus, Save } from "lucide-react";
import type { ContentItem, ContentType, MediaAsset, TaxonomyItem, Visibility } from "@/lib/db";

type DashboardComposerProps = {
  initialContents: ContentItem[];
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
};

export function DashboardComposer({ initialContents, categories, tags }: DashboardComposerProps) {
  const [contents, setContents] = useState(initialContents);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [type, setType] = useState<ContentType>("entry");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [uploadedAssets, setUploadedAssets] = useState<MediaAsset[]>([]);
  const [status, setStatus] = useState("准备记录。");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const publicCount = useMemo(
    () => contents.filter((item) => item.visibility === "public").length,
    [contents],
  );

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

    setUploadedAssets((current) => [result.asset, ...current]);
    setAssetIds((current) => [result.asset.id, ...current]);
    setStatus("图片已上传，会随下一条内容一起保存关联。");
    event.target.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("正在保存。");

    const response = await fetch("/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        title,
        categoryId,
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

    setContents((current) => [result.content, ...current]);
    setTitle("");
    setBody("");
    setCategoryId(categories[0]?.id ?? "");
    setSelectedTagIds([]);
    setAssetIds([]);
    setUploadedAssets([]);
    setStatus("已保存到 SQLite。公开内容会进入博客和 self-LLM 检索来源。");
  }

  return (
    <section className="section dashboard-grid">
      <form className="panel" onSubmit={handleSubmit}>
        <h2>今日收集箱</h2>
        <div className="form-grid">
          <label>
            <span>标题</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：今天关于 self-LLM 的想法"
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
            placeholder="记录日记、想法、文章草稿或可公开记忆。"
            required
          />
        </label>

        {uploadedAssets.length > 0 ? (
          <div className="asset-strip">
            {uploadedAssets.map((asset) => (
              <figure key={asset.id}>
                <img src={`/assets/${asset.id}`} alt={asset.alt} />
                <figcaption>{asset.fileName}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        <div className="actions">
          <button className="button primary" type="submit" disabled={isSaving || !categoryId}>
            <Save aria-hidden="true" size={17} />
            {isSaving ? "保存中" : "保存记录"}
          </button>
          <label className="button file-button">
            <ImagePlus aria-hidden="true" size={17} />
            {isUploading ? "上传中" : "添加图片"}
            <input accept="image/*" type="file" onChange={handleUpload} />
          </label>
        </div>
        <p className="muted">{status}</p>
      </form>

      <aside className="side-stack">
        <section className="panel">
          <h2>当前状态</h2>
          <ul className="status-list">
            <li>
              <span>内容总数</span>
              <strong>{contents.length}</strong>
            </li>
            <li>
              <span>公开来源</span>
              <strong>{publicCount}</strong>
            </li>
            <li>
              <span>已关联待保存图片</span>
              <strong>{assetIds.length}</strong>
            </li>
          </ul>
        </section>

        <section className="panel">
          <h2>近期内容</h2>
          <div className="source-list">
            {contents.map((item) => (
              <article className="source-card" key={item.id}>
                <div className="module-meta">
                  <span>{item.type}</span>
                  <span>{item.category}</span>
                  <span>{item.visibility}</span>
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
              </article>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
