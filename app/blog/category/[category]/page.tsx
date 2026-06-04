import { BlogIndex } from "../../BlogIndex";
import { listContents, listPublicCategories, listPublicTags } from "@/lib/db";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);
  const posts = listContents({
    visibility: "public",
    type: "post",
    category: decodedCategory,
  });

  return (
    <BlogIndex
      title={decodedCategory}
      description={`分类「${decodedCategory}」下的公开文章。`}
      posts={posts}
      categories={listPublicCategories()}
      tags={listPublicTags()}
    />
  );
}

