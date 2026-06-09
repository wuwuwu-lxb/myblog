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
            <Link
              className={`article-card ${post.coverAsset ? "with-cover" : ""}`}
              href={`/blog/${post.slug}`}
              prefetch={false}
              key={post.id}
            >
              <span className="article-card-main">
                <div className="module-meta">
                  <span>发布 {post.publishedAt.slice(0, 10)}</span>
                  <span>改 {post.updatedAt.slice(0, 10)}</span>
                  <span>浏览 {post.viewCount}</span>
                  <span>{post.category}</span>
                </div>
                <h2>{post.title}</h2>
                <p>{post.summary}</p>
                <span className="tag-row">
                  {post.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </span>
              </span>
              {post.coverAsset ? (
                <span className="article-card-cover">
                  <img src={`/assets/${post.coverAsset.id}`} alt={post.coverAsset.alt || post.title} />
                </span>
              ) : null}
            </Link>
          ))}
          {posts.length === 0 ? <p className="muted">这个视图下还没有公开文章。</p> : null}
        </div>
      </section>
    </div>
  );
}
