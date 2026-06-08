import { BlogIndex } from "./BlogIndex";
import { listContents, listPublicCategories, listPublicTags } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function BlogPage() {
  const posts = listContents({ visibility: "public", type: "post" });

  return (
    <BlogIndex
      title="公开来源库"
      description=""
      posts={posts}
      categories={listPublicCategories()}
      tags={listPublicTags()}
    />
  );
}
