import Image from "next/image";
import { notFound } from "next/navigation";
import { getContentBySlug, listContents } from "@/lib/db";

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
  const post = getContentBySlug(slug);

  if (!post || post.visibility !== "public" || post.type !== "post") {
    notFound();
  }

  return (
    <article className="page">
      <p className="eyebrow">公开文章</p>
      <h1>{post.title}</h1>
      <p className="lead">{post.summary}</p>

      <div className="tag-row">
        <span className="tag">{post.category}</span>
        {post.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      {post.assets?.map((asset) => (
        <section className="section panel" key={asset.id}>
          <Image
            src={`/assets/${asset.id}`}
            alt={asset.alt}
            width={960}
            height={520}
            style={{ width: "100%", height: "auto", borderRadius: 8 }}
          />
          <p className="muted">{asset.fileName}</p>
        </section>
      ))}

      <section className="section panel">
        <p>{post.body}</p>
      </section>
    </article>
  );
}
