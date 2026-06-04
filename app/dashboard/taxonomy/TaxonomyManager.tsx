"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { TaxonomyItem } from "@/lib/db";

type TaxonomyManagerProps = {
  initialCategories: TaxonomyItem[];
  initialTags: TaxonomyItem[];
};

export function TaxonomyManager({ initialCategories, initialTags }: TaxonomyManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [tags, setTags] = useState(initialTags);
  const [categoryName, setCategoryName] = useState("");
  const [tagName, setTagName] = useState("");
  const [status, setStatus] = useState("先创建受控分类和标签，再给内容选择。");

  async function createTaxonomy(kind: "category" | "tag", name: string) {
    const endpoint = kind === "category" ? "/api/categories" : "/api/tags";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error ?? "创建失败。");
      return;
    }

    if (kind === "category") {
      setCategories((current) => [...current, result.category].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryName("");
      setStatus(`已创建分类：${result.category.name}`);
    } else {
      setTags((current) => [...current, result.tag].sort((a, b) => a.name.localeCompare(b.name)));
      setTagName("");
      setStatus(`已创建标签：${result.tag.name}`);
    }
  }

  return (
    <section className="section dashboard-grid">
      <article className="panel">
        <h2>创建分类</h2>
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createTaxonomy("category", categoryName);
          }}
        >
          <input
            className="input"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="例如：技术、学习、项目、观点"
            required
          />
          <button className="button primary" type="submit">
            <Plus aria-hidden="true" size={17} />
            创建
          </button>
        </form>

        <h2>创建标签</h2>
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createTaxonomy("tag", tagName);
          }}
        >
          <input
            className="input"
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
            placeholder="例如：RAG、Next.js、复盘"
            required
          />
          <button className="button primary" type="submit">
            <Plus aria-hidden="true" size={17} />
            创建
          </button>
        </form>
        <p className="muted">{status}</p>
      </article>

      <aside className="side-stack">
        <section className="panel">
          <h2>分类库</h2>
          <div className="filter-list">
            {categories.map((category) => (
              <span className="readonly-row" key={category.id}>
                {category.name}
              </span>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>标签库</h2>
          <div className="tag-row">
            {tags.map((tag) => (
              <span className="tag" key={tag.id}>
                {tag.name}
              </span>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}

