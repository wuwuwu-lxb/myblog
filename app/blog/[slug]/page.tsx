import { notFound } from "next/navigation";
import { getContentBySlug, incrementContentViewCount, listContents } from "@/lib/db";
import { extractMarkdownHeadings, MarkdownPreview } from "@/app/MarkdownPreview";
import { ArticleToc } from "../ArticleToc";
import { GiscusComments } from "../GiscusComments";

export const dynamic = "force-dynamic";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return listContents({ visibility: "public", type: "post" }).map((item) => ({
      slug: item.slug,
    }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const foundPost = getContentBySlug(slug);

  if (!foundPost || foundPost.visibility !== "public" || foundPost.type !== "post") {
    notFound();
  }

  const post = incrementContentViewCount(foundPost.id) ?? foundPost;
  const headings = extractMarkdownHeadings(post.body);

  return (
    <article className="page">
      <p className="eyebrow">公开文章</p>
      <h1>{post.title}</h1>
      <p className="lead">{post.summary}</p>

      <div className="module-meta article-stats">
        <span>发布 {post.publishedAt.slice(0, 10)}</span>
        <span>修改 {post.updatedAt.slice(0, 10)}</span>
        <span>浏览 {post.viewCount}</span>
      </div>

      <div className="tag-row">
        <span className="tag">{post.category}</span>
        {post.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      {post.coverAsset ? (
        <section className="section article-cover">
          <img src={`/assets/${post.coverAsset.id}`} alt={post.coverAsset.alt || post.title} />
        </section>
      ) : null}

      <section className={`section article-layout ${headings.length === 0 ? "without-toc" : ""}`}>
        <article className="panel article-body">
          <MarkdownPreview content={post.body} />
        </article>
        {headings.length > 0 ? <ArticleToc headings={headings} /> : null}
      </section>

      <GiscusComments term={post.slug} />
    </article>
  );
}
