"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TaxonomyItem } from "@/lib/db";

type TaxonomyManagerProps = {
  initialCategories: TaxonomyItem[];
  initialTags: TaxonomyItem[];
};

type TaxonomyKind = "category" | "tag";

function parseNames(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,，]/)
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  );
}

function mergeTaxonomy(current: TaxonomyItem[], incoming: TaxonomyItem[]) {
  const items = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    items.set(item.id, item);
  }

  return Array.from(items.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function TaxonomyManager({ initialCategories, initialTags }: TaxonomyManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [tags, setTags] = useState(initialTags);
  const [categoryNames, setCategoryNames] = useState("");
  const [tagNames, setTagNames] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [status, setStatus] = useState("先创建受控分类和标签，再给内容选择。");

  async function createTaxonomy(kind: TaxonomyKind, rawNames: string) {
    const names = parseNames(rawNames);

    if (names.length === 0) {
      setStatus(kind === "category" ? "分类名称不能为空。" : "标签名称不能为空。");
      return;
    }

    const endpoint = kind === "category" ? "/api/categories" : "/api/tags";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ names }),
    });
    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error ?? "创建失败。");
      return;
    }

    if (kind === "category") {
      setCategories((current) => mergeTaxonomy(current, result.categories));
      setCategoryNames("");
      setStatus(`已创建 ${result.categories.length} 个分类。`);
    } else {
      setTags((current) => mergeTaxonomy(current, result.tags));
      setTagNames("");
      setStatus(`已创建 ${result.tags.length} 个标签。`);
    }
  }

  function toggleSelected(kind: TaxonomyKind, id: string) {
    const setter = kind === "category" ? setSelectedCategoryIds : setSelectedTagIds;
    setter((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function deleteSelected(kind: TaxonomyKind) {
    const ids = kind === "category" ? selectedCategoryIds : selectedTagIds;

    if (ids.length === 0) {
      setStatus(kind === "category" ? "先选择要删除的分类。" : "先选择要删除的标签。");
      return;
    }

    const message =
      kind === "category"
        ? `确认删除 ${ids.length} 个分类？关联内容会移动到未分类。`
        : `确认删除 ${ids.length} 个标签？关联内容会移除这些标签。`;

    if (!window.confirm(message)) {
      return;
    }

    const endpoint = kind === "category" ? "/api/categories" : "/api/tags";
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    });
    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error ?? "删除失败。");
      return;
    }

    if (kind === "category") {
      setCategories(result.categories);
      setSelectedCategoryIds([]);
      setStatus(`已删除 ${result.deleted} 个分类，关联内容已移动到未分类。`);
    } else {
      setTags(result.tags);
      setSelectedTagIds([]);
      setStatus(`已删除 ${result.deleted} 个标签，关联内容已移除这些标签。`);
    }
  }

  return (
    <section className="section dashboard-grid">
      <article className="panel taxonomy-create">
        <h2>创建分类</h2>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createTaxonomy("category", categoryNames);
          }}
        >
          <textarea
            className="textarea compact"
            value={categoryNames}
            onChange={(event) => setCategoryNames(event.target.value)}
            placeholder="技术&#10;学习&#10;项目&#10;观点"
            required
          />
          <button className="button primary" type="submit">
            <Plus aria-hidden="true" size={17} />
            创建分类
          </button>
        </form>

        <h2>创建标签</h2>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createTaxonomy("tag", tagNames);
          }}
        >
          <textarea
            className="textarea compact"
            value={tagNames}
            onChange={(event) => setTagNames(event.target.value)}
            placeholder="RAG&#10;Next.js&#10;复盘"
            required
          />
          <button className="button primary" type="submit">
            <Plus aria-hidden="true" size={17} />
            创建标签
          </button>
        </form>
        <p className="muted">{status}</p>
      </article>

      <aside className="side-stack">
        <section className="panel">
          <div className="manager-head">
            <h2>分类库</h2>
            <button className="button danger-button" type="button" onClick={() => void deleteSelected("category")}>
              <Trash2 aria-hidden="true" size={16} />
              删除选中
            </button>
          </div>
          <div className="filter-list">
            {categories.map((category) => (
              <label className="readonly-row selectable-row" key={category.id}>
                <span>{category.name}</span>
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.includes(category.id)}
                  onChange={() => toggleSelected("category", category.id)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="manager-head">
            <h2>标签库</h2>
            <button className="button danger-button" type="button" onClick={() => void deleteSelected("tag")}>
              <Trash2 aria-hidden="true" size={16} />
              删除选中
            </button>
          </div>
          <div className="filter-list">
            {tags.map((tag) => (
              <label className="readonly-row selectable-row" key={tag.id}>
                <span>{tag.name}</span>
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={() => toggleSelected("tag", tag.id)}
                />
              </label>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
