import { BlogIndex } from "./BlogIndex";
import { listContents, listPublicCategories, listPublicTags } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function BlogPage() {
  const posts = listContents({ visibility: "public", type: "post" });

  return (
    <BlogIndex
      title="博客"
      description="公开文章会同时成为 self-LLM 的知识来源。分类用于栏目结构，标签用于主题连接。"
      posts={posts}
      categories={listPublicCategories()}
      tags={listPublicTags()}
    />
  );
}

