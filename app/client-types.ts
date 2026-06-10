export type Visibility = "private" | "draft" | "public";
export type ContentType = "entry" | "note" | "post" | "memory";
export type AssetUsageScope = "inline" | "reusable";

export type MediaAsset = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  alt: string;
  usageScope: AssetUsageScope;
  createdAt: string;
};

export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
};

export type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  categoryId: string;
  category: string;
  summary: string;
  body: string;
  tags: string[];
  tagIds: string[];
  visibility: Visibility;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  coverAssetId: string;
  coverAsset: MediaAsset | null;
  assets: MediaAsset[];
};

export type ContentListItem = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  category: string;
  summary: string;
  visibility: Visibility;
  publishedAt: string;
  updatedAt: string;
  viewCount: number;
};

export type LlmMode = "qa" | "chat";
export type LlmIntent = "answer" | "recommend" | "mixed";

export type PublicLlmSource = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string[];
  publishedAt: string;
  score: number;
};

export type LlmMeta = {
  mode: LlmMode;
  intent: LlmIntent;
  sources: PublicLlmSource[];
  recommendations: PublicLlmSource[];
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
};

export type OnlineStatus = {
  id: string;
  message: string;
  createdAt: string;
  expiresAt: string;
};
