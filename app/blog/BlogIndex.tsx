import Link from "next/link";
import type { ContentItem } from "@/lib/db";

type CountItem = {
  name: string;
  count: number;
};

type BlogIndexProps = {
  title: string;
  description: string;
  posts: ContentItem[];
  categories: CountItem[];
  tags: CountItem[];
};

export function BlogIndex({ title, description, posts, categories, tags }: BlogIndexProps) {
  return (
    <div className="page">
      <p className="eyebrow">公开内容</p>
      <h1>{title}</h1>
      <p className="lead">{description}</p>

      <section className="section blog-layout">
        <aside className="blog-sidebar">
          <div className="panel">
            <h2>分类</h2>
            <div className="filter-list">
              <Link href="/blog">全部</Link>
              {categories.map((category) => (
                <Link href={`/blog/category/${encodeURIComponent(category.name)}`} key={category.name}>
                  <span>{category.name}</span>
                  <strong>{category.count}</strong>
                </Link>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>标签</h2>
            <div className="tag-row">
              {tags.map((tag) => (
                <Link className="tag" href={`/blog/tag/${encodeURIComponent(tag.name)}`} key={tag.name}>
                  {tag.name} {tag.count}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="article-list">
          {posts.map((post) => (
            <Link className="article-card" href={`/blog/${post.slug}`} key={post.id}>
              <div className="module-meta">
                <span>{post.updatedAt.slice(0, 10)}</span>
                <span>{post.category}</span>
                <span>{post.visibility}</span>
              </div>
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
              <div className="tag-row">
                {post.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
          {posts.length === 0 ? <p className="muted">这个视图下还没有公开文章。</p> : null}
        </div>
      </section>
    </div>
  );
}
