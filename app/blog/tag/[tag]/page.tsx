import { BlogIndex } from "../../BlogIndex";
import { listContents, listPublicCategories, listPublicTags } from "@/lib/db";

export const dynamic = "force-dynamic";

type TagPageProps = {
  params: Promise<{
    tag: string;
  }>;
};

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const posts = listContents({
    visibility: "public",
    type: "post",
    tag: decodedTag,
  });

  return (
    <BlogIndex
      title={`#${decodedTag}`}
      description={`标签「${decodedTag}」关联的公开文章。`}
      posts={posts}
      categories={listPublicCategories()}
      tags={listPublicTags()}
    />
  );
}

