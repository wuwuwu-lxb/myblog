import { existsSync, mkdirSync } from "node:fs";
import { unlinkSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Visibility = "private" | "draft" | "public";
export type ContentType = "entry" | "note" | "post" | "memory";
export type AssetUsageScope = "inline" | "reusable";

export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
};

export type TaxonomyCount = TaxonomyItem & {
  count: number;
};

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

export type DashboardStats = {
  contentCount: number;
  assetCount: number;
  publicSourceCount: number;
};

export type SiteStats = {
  startedAt: string;
  totalPublicContent: number;
  totalPosts: number;
  totalDiaryEntries: number;
  totalVisits: number;
  uniqueVisitors: number;
  totalWords: number;
};

export type OnlineStatus = {
  id: string;
  message: string;
  createdAt: string;
  expiresAt: string;
};

export type SiteSetting = {
  key: string;
  value: string;
  updatedAt: string;
};

export type VisitGeo = {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
};

export type VisitorLocation = {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  count: number;
  lastSeenAt: string;
};

export type ChatRateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
};

type ContentRow = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  categoryId: string | null;
  category: string;
  summary: string;
  body: string;
  tagsJson: string;
  visibility: Visibility;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  coverAssetId: string | null;
};

type ContentListRow = {
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

type AssetRow = Omit<MediaAsset, "sizeBytes"> & {
  sizeBytes: number;
};

type TaxonomyRow = TaxonomyItem;

const rootDir = process.cwd();
const dataDir = path.join(rootDir, "data");
const dbPath = path.join(dataDir, "selfwiki.sqlite");
const defaultCategoryName = "未分类";

let db: DatabaseSync | null = null;

export function getDb() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!db) {
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    migrate(db);
    seed(db);
    migrateLegacyTaxonomy(db);
  }

  return db;
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contents (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT '未分类',
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      summary TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      visibility TEXT NOT NULL DEFAULT 'private',
      published_at TEXT,
      cover_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      view_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS content_tags (
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (content_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      alt TEXT NOT NULL DEFAULT '',
      usage_scope TEXT NOT NULL DEFAULT 'inline',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_assets (
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      PRIMARY KEY (content_id, asset_id)
    );

    CREATE TABLE IF NOT EXISTS site_visits (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      ip_address TEXT NOT NULL DEFAULT '',
      visitor_id TEXT NOT NULL DEFAULT '',
      event_type TEXT NOT NULL DEFAULT 'site',
      user_agent TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      region TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS online_statuses (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_rate_limits (
      bucket_key TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (bucket_key, day)
    );
  `);

  const columns = database.prepare("PRAGMA table_info(contents)").all() as { name: string }[];
  const hasCategory = columns.some((column) => column.name === "category");
  const hasCategoryId = columns.some((column) => column.name === "category_id");
  const hasCoverAssetId = columns.some((column) => column.name === "cover_asset_id");
  const hasPublishedAt = columns.some((column) => column.name === "published_at");
  const hasViewCount = columns.some((column) => column.name === "view_count");

  if (!hasCategory) {
    database.exec("ALTER TABLE contents ADD COLUMN category TEXT NOT NULL DEFAULT '未分类';");
  }

  if (!hasCategoryId) {
    database.exec("ALTER TABLE contents ADD COLUMN category_id TEXT REFERENCES categories(id) ON DELETE SET NULL;");
  }

  if (!hasCoverAssetId) {
    database.exec("ALTER TABLE contents ADD COLUMN cover_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL;");
  }

  if (!hasPublishedAt) {
    database.exec("ALTER TABLE contents ADD COLUMN published_at TEXT;");
    database.exec("UPDATE contents SET published_at = created_at WHERE published_at IS NULL;");
  }

  if (!hasViewCount) {
    database.exec("ALTER TABLE contents ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;");
  }

  const assetColumns = database.prepare("PRAGMA table_info(assets)").all() as { name: string }[];
  const hasUsageScope = assetColumns.some((column) => column.name === "usage_scope");

  if (!hasUsageScope) {
    database.exec("ALTER TABLE assets ADD COLUMN usage_scope TEXT NOT NULL DEFAULT 'inline';");
  }

  const visitColumns = database.prepare("PRAGMA table_info(site_visits)").all() as { name: string }[];
  const hasVisitorId = visitColumns.some((column) => column.name === "visitor_id");
  const hasEventType = visitColumns.some((column) => column.name === "event_type");
  const hasCountry = visitColumns.some((column) => column.name === "country");
  const hasRegion = visitColumns.some((column) => column.name === "region");
  const hasCity = visitColumns.some((column) => column.name === "city");
  const hasLatitude = visitColumns.some((column) => column.name === "latitude");
  const hasLongitude = visitColumns.some((column) => column.name === "longitude");

  if (!hasVisitorId) {
    database.exec("ALTER TABLE site_visits ADD COLUMN visitor_id TEXT NOT NULL DEFAULT '';");
  }

  if (!hasEventType) {
    database.exec("ALTER TABLE site_visits ADD COLUMN event_type TEXT NOT NULL DEFAULT 'site';");
  }

  if (!hasCountry) {
    database.exec("ALTER TABLE site_visits ADD COLUMN country TEXT NOT NULL DEFAULT '';");
  }

  if (!hasRegion) {
    database.exec("ALTER TABLE site_visits ADD COLUMN region TEXT NOT NULL DEFAULT '';");
  }

  if (!hasCity) {
    database.exec("ALTER TABLE site_visits ADD COLUMN city TEXT NOT NULL DEFAULT '';");
  }

  if (!hasLatitude) {
    database.exec("ALTER TABLE site_visits ADD COLUMN latitude REAL;");
  }

  if (!hasLongitude) {
    database.exec("ALTER TABLE site_visits ADD COLUMN longitude REAL;");
  }
}

function seed(database: DatabaseSync) {
  const count = database.prepare("SELECT COUNT(*) AS count FROM contents").get() as { count: number };

  ensureCategory(database, defaultCategoryName);

  if (count.count > 0) {
    return;
  }

  ensureCategory(database, "观点");
  ensureCategory(database, "技术");
  ensureCategory(database, "日记");
  ensureTag(database, "self-LLM");
  ensureTag(database, "博客");
  ensureTag(database, "知识库");
  ensureTag(database, "安全");
  ensureTag(database, "RAG");
  ensureTag(database, "幻觉");
  ensureTag(database, "复盘");
  ensureTag(database, "MVP");

  createContentWithDb(database, {
    id: "post-why-self-llm",
    type: "post",
    title: "为什么个人博客需要 self-LLM",
    slug: "why-self-llm",
    categoryId: ensureCategory(database, "观点").id,
    body:
      "这个项目的核心不是把文章换一种方式展示，而是把长期写作、日记、项目记录和知识库整理成一个可以对话的个人接口。公开内容是 self-LLM 的知识来源，日常复盘是它持续生长的内部机制。",
    tags: ["self-LLM", "博客", "知识库"],
    visibility: "public",
  });

  createContentWithDb(database, {
    id: "note-system-boundary",
    type: "note",
    title: "self-LLM 的边界",
    slug: "self-llm-boundary",
    categoryId: ensureCategory(database, "技术").id,
    body:
      "为了减少幻觉，self-LLM 的回答应尽量基于检索到的公开内容。资料不足时，它应该说不知道，或者只给出推测并标注不确定性。",
    tags: ["安全", "RAG", "幻觉"],
    visibility: "public",
  });

  createContentWithDb(database, {
    id: "entry-daily-review",
    type: "entry",
    title: "今日复盘样例",
    slug: "daily-review-sample",
    categoryId: ensureCategory(database, "日记").id,
    body: "项目早期最重要的是让系统可以每天被使用。先记录、再复盘、再把可公开内容沉淀到 self-LLM。",
    tags: ["复盘", "MVP"],
    visibility: "private",
  });
}

function migrateLegacyTaxonomy(database: DatabaseSync) {
  const rows = database
    .prepare(
      `
      SELECT id, category, tags_json AS tagsJson, category_id AS categoryId
      FROM contents
    `,
    )
    .all() as { id: string; category: string; tagsJson: string; categoryId: string | null }[];

  const updateCategory = database.prepare("UPDATE contents SET category_id = ?, category = ? WHERE id = ?");
  const linkTag = database.prepare("INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)");

  for (const row of rows) {
    const category = ensureCategory(database, row.category || defaultCategoryName);

    if (!row.categoryId) {
      updateCategory.run(category.id, category.name, row.id);
    }

    for (const tagName of safeParseTags(row.tagsJson)) {
      const tag = ensureTag(database, tagName);
      linkTag.run(row.id, tag.id);
    }
  }
}

function mapContentRow(row: ContentRow): ContentItem {
  const tags = getTagsForContent(row.id);

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    categoryId: row.categoryId ?? ensureCategory(getDb(), row.category || defaultCategoryName).id,
    category: row.category || defaultCategoryName,
    summary: row.summary,
    body: row.body,
    visibility: row.visibility,
    publishedAt: row.publishedAt ?? row.createdAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    viewCount: row.viewCount,
    coverAssetId: row.coverAssetId ?? "",
    coverAsset: row.coverAssetId ? getAsset(row.coverAssetId) : null,
    tags: tags.map((tag) => tag.name),
    tagIds: tags.map((tag) => tag.id),
    assets: getAssetsForContent(row.id),
  };
}

function mapAssetRow(row: AssetRow): MediaAsset {
  return {
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storagePath: row.storagePath,
    alt: row.alt,
    usageScope: row.usageScope,
    createdAt: row.createdAt,
  };
}

function mapContentListRow(row: ContentListRow): ContentListItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    category: row.category || defaultCategoryName,
    summary: row.summary,
    visibility: row.visibility,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    viewCount: row.viewCount,
  };
}

function mapTaxonomyRow(row: TaxonomyRow): TaxonomyItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdAt: row.createdAt,
  };
}

export function listContents(
  options: { visibility?: Visibility; type?: ContentType; category?: string; tag?: string } = {},
) {
  const database = getDb();
  const clauses: string[] = [];
  const params: string[] = [];

  if (options.visibility) {
    clauses.push("c.visibility = ?");
    params.push(options.visibility);
  }

  if (options.type) {
    clauses.push("c.type = ?");
    params.push(options.type);
  }

  if (options.category) {
    clauses.push("cat.name = ?");
    params.push(options.category);
  }

  if (options.tag) {
    clauses.push("EXISTS (SELECT 1 FROM content_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.content_id = c.id AND t.name = ?)");
    params.push(options.tag);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = database
    .prepare(
      `
      SELECT
        c.id,
        c.type,
        c.title,
        c.slug,
        c.category_id AS categoryId,
        COALESCE(cat.name, c.category, '未分类') AS category,
        c.summary,
        c.body,
        c.tags_json AS tagsJson,
        c.visibility,
        COALESCE(c.published_at, c.created_at) AS publishedAt,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        c.view_count AS viewCount,
        c.cover_asset_id AS coverAssetId
      FROM contents c
      LEFT JOIN categories cat ON cat.id = c.category_id
      ${where}
      ORDER BY COALESCE(c.published_at, c.created_at) DESC, c.updated_at DESC
    `,
    )
    .all(...params) as ContentRow[];

  return rows.map(mapContentRow);
}

export function listContentSummaries() {
  const rows = getDb()
    .prepare(
      `
      SELECT
        c.id,
        c.type,
        c.title,
        c.slug,
        COALESCE(cat.name, c.category, '未分类') AS category,
        c.summary,
        c.visibility,
        COALESCE(c.published_at, c.created_at) AS publishedAt,
        c.updated_at AS updatedAt,
        c.view_count AS viewCount
      FROM contents c
      LEFT JOIN categories cat ON cat.id = c.category_id
      ORDER BY COALESCE(c.published_at, c.created_at) DESC, c.updated_at DESC
    `,
    )
    .all() as ContentListRow[];

  return rows.map(mapContentListRow);
}

export function getDashboardStats(): DashboardStats {
  const database = getDb();
  const contentCount = database.prepare("SELECT COUNT(*) AS count FROM contents").get() as { count: number };
  const assetCount = database.prepare("SELECT COUNT(*) AS count FROM assets").get() as { count: number };
  const publicSourceCount = database
    .prepare("SELECT COUNT(*) AS count FROM contents WHERE visibility = 'public'")
    .get() as { count: number };

  return {
    contentCount: contentCount.count,
    assetCount: assetCount.count,
    publicSourceCount: publicSourceCount.count,
  };
}

export function getSiteStats(): SiteStats {
  const database = getDb();
  const fallbackStart = new Date().toISOString();
  const startedAt = database
    .prepare(
      `
      SELECT COALESCE(MIN(created_at), ?) AS startedAt
      FROM contents
    `,
    )
    .get(fallbackStart) as { startedAt: string };
  const totalPublicContent = database
    .prepare("SELECT COUNT(*) AS count FROM contents WHERE visibility = 'public'")
    .get() as { count: number };
  const totalPosts = database
    .prepare("SELECT COUNT(*) AS count FROM contents WHERE visibility = 'public' AND type = 'post'")
    .get() as { count: number };
  const totalDiaryEntries = database
    .prepare("SELECT COUNT(*) AS count FROM contents WHERE visibility = 'public' AND type = 'entry'")
    .get() as { count: number };
  const totalVisits = database
    .prepare("SELECT COUNT(*) AS count FROM site_visits WHERE event_type = 'site'")
    .get() as { count: number };
  const uniqueVisitors = database
    .prepare(
      `
      SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), NULLIF(ip_address, ''))) AS count
      FROM site_visits
      WHERE event_type = 'site' AND (visitor_id != '' OR ip_address != '')
    `,
    )
    .get() as { count: number };
  const totalWords = database
    .prepare("SELECT COALESCE(SUM(LENGTH(body)), 0) AS count FROM contents WHERE visibility = 'public'")
    .get() as { count: number };

  return {
    startedAt: startedAt.startedAt,
    totalPublicContent: totalPublicContent.count,
    totalPosts: totalPosts.count,
    totalDiaryEntries: totalDiaryEntries.count,
    totalVisits: totalVisits.count,
    uniqueVisitors: uniqueVisitors.count,
    totalWords: totalWords.count,
  };
}

export function getContentBySlug(slug: string) {
  const database = getDb();
  const row = database
    .prepare(
      `
      SELECT
        c.id,
        c.type,
        c.title,
        c.slug,
        c.category_id AS categoryId,
        COALESCE(cat.name, c.category, '未分类') AS category,
        c.summary,
        c.body,
        c.tags_json AS tagsJson,
        c.visibility,
        COALESCE(c.published_at, c.created_at) AS publishedAt,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        c.view_count AS viewCount,
        c.cover_asset_id AS coverAssetId
      FROM contents c
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.slug = ?
    `,
    )
    .get(slug) as ContentRow | undefined;

  return row ? mapContentRow(row) : null;
}

export function getContentById(id: string) {
  const database = getDb();
  const row = database
    .prepare(
      `
      SELECT
        c.id,
        c.type,
        c.title,
        c.slug,
        c.category_id AS categoryId,
        COALESCE(cat.name, c.category, '未分类') AS category,
        c.summary,
        c.body,
        c.tags_json AS tagsJson,
        c.visibility,
        COALESCE(c.published_at, c.created_at) AS publishedAt,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        c.view_count AS viewCount,
        c.cover_asset_id AS coverAssetId
      FROM contents c
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.id = ?
    `,
    )
    .get(id) as ContentRow | undefined;

  return row ? mapContentRow(row) : null;
}

export function createContent(input: {
  type: ContentType;
  title: string;
  categoryId: string;
  summary?: string;
  body: string;
  tagIds: string[];
  visibility: Visibility;
  publishedAt?: string;
  assetIds?: string[];
  coverAssetId?: string;
}) {
  return createContentWithDb(getDb(), {
    ...input,
    id: crypto.randomUUID(),
    slug: createSlug(input.title, crypto.randomUUID()),
    publishedAt: input.publishedAt,
    tags: input.tagIds
      .map((tagId) => getTag(tagId)?.name)
      .filter((name): name is string => Boolean(name)),
  });
}

export function updateContent(
  id: string,
  input: {
    type: ContentType;
    title: string;
    categoryId: string;
    summary?: string;
    body: string;
    tagIds: string[];
    visibility: Visibility;
    publishedAt?: string;
    assetIds?: string[];
    coverAssetId?: string;
  },
) {
  const database = getDb();
  const existing = getContentById(id);

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const publishedAt = normalizeDateInput(input.publishedAt) ?? existing.publishedAt ?? existing.createdAt;
  const category = getCategoryWithDb(database, input.categoryId) ?? ensureCategory(database, defaultCategoryName);
  const tagItems = input.tagIds
    .map((tagId) => getTag(tagId))
    .filter((tag): tag is TaxonomyItem => Boolean(tag));
  const summary = input.summary?.trim() || input.body.trim().slice(0, 120);

  database
    .prepare(
      `
      UPDATE contents
      SET type = ?, title = ?, category = ?, category_id = ?, summary = ?, body = ?, tags_json = ?, visibility = ?, published_at = ?, cover_asset_id = ?, updated_at = ?
      WHERE id = ?
    `,
    )
    .run(
      input.type,
      input.title.trim(),
      category.name,
      category.id,
      summary,
      input.body.trim(),
      JSON.stringify(tagItems.map((tag) => tag.name)),
      input.visibility,
      publishedAt,
      input.coverAssetId?.trim() || null,
      now,
      id,
    );

  database.prepare("DELETE FROM content_tags WHERE content_id = ?").run(id);
  const linkTag = database.prepare("INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)");
  for (const tag of tagItems) {
    linkTag.run(id, tag.id);
  }

  database.prepare("DELETE FROM content_assets WHERE content_id = ?").run(id);
  if (input.assetIds?.length) {
    const linkAsset = database.prepare("INSERT OR IGNORE INTO content_assets (content_id, asset_id) VALUES (?, ?)");
    for (const assetId of input.assetIds) {
      linkAsset.run(id, assetId);
    }
  }

  return getContentById(id);
}

export function updateContentVisibility(id: string, visibility: Visibility) {
  const database = getDb();
  const existing = getContentById(id);

  if (!existing) {
    return null;
  }

  database
    .prepare("UPDATE contents SET visibility = ?, updated_at = ? WHERE id = ?")
    .run(visibility, new Date().toISOString(), id);

  return getContentById(id);
}

export function deleteContent(id: string) {
  const database = getDb();
  const existing = getContentById(id);

  if (!existing) {
    return false;
  }

  database.prepare("DELETE FROM contents WHERE id = ?").run(id);
  return true;
}

function createContentWithDb(
  database: DatabaseSync,
  input: {
    id: string;
    type: ContentType;
    title: string;
    slug: string;
    categoryId: string;
    summary?: string;
    body: string;
    tags: string[];
    visibility: Visibility;
    publishedAt?: string;
    assetIds?: string[];
    coverAssetId?: string;
  },
) {
  const now = new Date().toISOString();
  const publishedAt = normalizeDateInput(input.publishedAt) ?? now;
  const category = getCategoryWithDb(database, input.categoryId) ?? ensureCategory(database, defaultCategoryName);
  const tagItems = input.tags.map((tagName) => ensureTag(database, tagName));
  const summary = input.summary?.trim() || input.body.trim().slice(0, 120);

  database
    .prepare(
      `
      INSERT INTO contents (
        id, type, title, slug, category, category_id, summary, body, tags_json, visibility, published_at, cover_asset_id, created_at, updated_at, view_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      input.id,
      input.type,
      input.title.trim(),
      input.slug,
      category.name,
      category.id,
      summary,
      input.body.trim(),
      JSON.stringify(tagItems.map((tag) => tag.name)),
      input.visibility,
      publishedAt,
      input.coverAssetId?.trim() || null,
      now,
      now,
      0,
    );

  const linkTag = database.prepare("INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)");
  for (const tag of tagItems) {
    linkTag.run(input.id, tag.id);
  }

  if (input.assetIds?.length) {
    const linkAsset = database.prepare("INSERT OR IGNORE INTO content_assets (content_id, asset_id) VALUES (?, ?)");
    for (const assetId of input.assetIds) {
      linkAsset.run(input.id, assetId);
    }
  }

  return getContentBySlug(input.slug);
}

export function listCategories() {
  const rows = getDb()
    .prepare(
      `
      SELECT id, name, slug, description, created_at AS createdAt
      FROM categories
      ORDER BY name ASC
    `,
    )
    .all() as TaxonomyRow[];

  return rows.map(mapTaxonomyRow);
}

export function listTags() {
  const rows = getDb()
    .prepare(
      `
      SELECT id, name, slug, description, created_at AS createdAt
      FROM tags
      ORDER BY name ASC
    `,
    )
    .all() as TaxonomyRow[];

  return rows.map(mapTaxonomyRow);
}

export function createCategory(name: string, description = "") {
  return ensureCategory(getDb(), name, description);
}

export function createTag(name: string, description = "") {
  return ensureTag(getDb(), name, description);
}

export function deleteCategories(ids: string[]) {
  const database = getDb();
  const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

  if (uniqueIds.length === 0) {
    return 0;
  }

  const fallback = ensureCategory(database, defaultCategoryName);
  const updateContent = database.prepare("UPDATE contents SET category_id = ?, category = ?, updated_at = ? WHERE category_id = ?");
  const deleteCategory = database.prepare("DELETE FROM categories WHERE id = ? AND id != ?");
  let deleted = 0;

  for (const id of uniqueIds) {
    if (id === fallback.id) {
      continue;
    }

    updateContent.run(fallback.id, fallback.name, new Date().toISOString(), id);
    const result = deleteCategory.run(id, fallback.id);
    deleted += Number(result.changes);
  }

  return deleted;
}

export function deleteTags(ids: string[]) {
  const database = getDb();
  const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

  if (uniqueIds.length === 0) {
    return 0;
  }

  const rows = database
    .prepare(
      `
      SELECT id, name, slug, description, created_at AS createdAt
      FROM tags
      WHERE id IN (${uniqueIds.map(() => "?").join(",")})
    `,
    )
    .all(...uniqueIds) as TaxonomyRow[];
  const deletedNames = new Set(rows.map((row) => row.name));
  const contentRows = database
    .prepare("SELECT id, tags_json AS tagsJson FROM contents")
    .all() as { id: string; tagsJson: string }[];
  const updateContentTags = database.prepare("UPDATE contents SET tags_json = ?, updated_at = ? WHERE id = ?");
  const deleteLinks = database.prepare("DELETE FROM content_tags WHERE tag_id = ?");
  const deleteTag = database.prepare("DELETE FROM tags WHERE id = ?");
  let deleted = 0;

  for (const row of contentRows) {
    const nextTags = safeParseTags(row.tagsJson).filter((name) => !deletedNames.has(name));
    updateContentTags.run(JSON.stringify(nextTags), new Date().toISOString(), row.id);
  }

  for (const id of uniqueIds) {
    deleteLinks.run(id);
    const result = deleteTag.run(id);
    deleted += Number(result.changes);
  }

  return deleted;
}

export function getCategory(id: string) {
  return getCategoryWithDb(getDb(), id);
}

function getCategoryWithDb(database: DatabaseSync, id: string) {
  const row = database
    .prepare(
      `
      SELECT id, name, slug, description, created_at AS createdAt
      FROM categories
      WHERE id = ?
    `,
    )
    .get(id) as TaxonomyRow | undefined;

  return row ? mapTaxonomyRow(row) : null;
}

export function getTag(id: string) {
  const row = getDb()
    .prepare(
      `
      SELECT id, name, slug, description, created_at AS createdAt
      FROM tags
      WHERE id = ?
    `,
    )
    .get(id) as TaxonomyRow | undefined;

  return row ? mapTaxonomyRow(row) : null;
}

export function getTagsForContent(contentId: string) {
  const rows = getDb()
    .prepare(
      `
      SELECT t.id, t.name, t.slug, t.description, t.created_at AS createdAt
      FROM tags t
      JOIN content_tags ct ON ct.tag_id = t.id
      WHERE ct.content_id = ?
      ORDER BY t.name ASC
    `,
    )
    .all(contentId) as TaxonomyRow[];

  return rows.map(mapTaxonomyRow);
}

export function listPublicCategories() {
  const rows = getDb()
    .prepare(
      `
      SELECT
        cat.id,
        cat.name,
        cat.slug,
        cat.description,
        cat.created_at AS createdAt,
        COUNT(c.id) AS count
      FROM categories cat
      JOIN contents c ON c.category_id = cat.id
      WHERE c.visibility = 'public' AND c.type = 'post'
      GROUP BY cat.id
      ORDER BY count DESC, cat.name ASC
    `,
    )
    .all() as (TaxonomyRow & { count: number })[];

  return rows.map((row) => ({ ...mapTaxonomyRow(row), count: row.count }));
}

export function listPublicTags() {
  const rows = getDb()
    .prepare(
      `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.description,
        t.created_at AS createdAt,
        COUNT(c.id) AS count
      FROM tags t
      JOIN content_tags ct ON ct.tag_id = t.id
      JOIN contents c ON c.id = ct.content_id
      WHERE c.visibility = 'public' AND c.type = 'post'
      GROUP BY t.id
      ORDER BY count DESC, t.name ASC
    `,
    )
    .all() as (TaxonomyRow & { count: number })[];

  return rows.map((row) => ({ ...mapTaxonomyRow(row), count: row.count }));
}

export function getAsset(id: string) {
  const database = getDb();
  const row = database
    .prepare(
      `
      SELECT
        id,
        file_name AS fileName,
        mime_type AS mimeType,
        size_bytes AS sizeBytes,
        storage_path AS storagePath,
        alt,
        usage_scope AS usageScope,
        created_at AS createdAt
      FROM assets
      WHERE id = ?
    `,
    )
    .get(id) as AssetRow | undefined;

  return row ? mapAssetRow(row) : null;
}

export function getAssetUsageCount(id: string) {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM content_assets WHERE asset_id = ?")
    .get(id) as { count: number };

  return row.count;
}

export function listAssets() {
  const rows = getDb()
    .prepare(
      `
      SELECT
        id,
        file_name AS fileName,
        mime_type AS mimeType,
        size_bytes AS sizeBytes,
        storage_path AS storagePath,
        alt,
        usage_scope AS usageScope,
        created_at AS createdAt
      FROM assets
      ORDER BY created_at DESC
    `,
    )
    .all() as AssetRow[];

  return rows.map(mapAssetRow);
}

export function listComposerAssets(contentId?: string) {
  const database = getDb();

  if (!contentId) {
    const rows = database
      .prepare(
        `
        SELECT
          id,
          file_name AS fileName,
          mime_type AS mimeType,
          size_bytes AS sizeBytes,
          storage_path AS storagePath,
          alt,
          usage_scope AS usageScope,
          created_at AS createdAt
        FROM assets
        WHERE usage_scope = 'reusable'
        ORDER BY created_at DESC
      `,
      )
      .all() as AssetRow[];

    return rows.map(mapAssetRow);
  }

  const rows = database
    .prepare(
      `
      SELECT DISTINCT
        a.id,
        a.file_name AS fileName,
        a.mime_type AS mimeType,
        a.size_bytes AS sizeBytes,
        a.storage_path AS storagePath,
        a.alt,
        a.usage_scope AS usageScope,
        a.created_at AS createdAt
      FROM assets a
      LEFT JOIN content_assets ca ON ca.asset_id = a.id AND ca.content_id = ?
      LEFT JOIN contents c ON c.cover_asset_id = a.id AND c.id = ?
      WHERE a.usage_scope = 'reusable' OR ca.content_id IS NOT NULL OR c.id IS NOT NULL
      ORDER BY a.created_at DESC
    `,
    )
    .all(contentId, contentId) as AssetRow[];

  return rows.map(mapAssetRow);
}

export function getAssetsForContent(contentId: string) {
  const rows = getDb()
    .prepare(
      `
      SELECT
        a.id,
        a.file_name AS fileName,
        a.mime_type AS mimeType,
        a.size_bytes AS sizeBytes,
        a.storage_path AS storagePath,
        a.alt,
        a.usage_scope AS usageScope,
        a.created_at AS createdAt
      FROM assets a
      JOIN content_assets ca ON ca.asset_id = a.id
      WHERE ca.content_id = ?
      ORDER BY a.created_at DESC
    `,
    )
    .all(contentId) as AssetRow[];

  return rows.map(mapAssetRow);
}

export function createAsset(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  alt?: string;
  usageScope?: AssetUsageScope;
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `
      INSERT INTO assets (
        id, file_name, mime_type, size_bytes, storage_path, alt, usage_scope, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      id,
      input.fileName,
      input.mimeType,
      input.sizeBytes,
      input.storagePath,
      input.alt ?? "",
      input.usageScope ?? "inline",
      now,
    );

  return getAsset(id);
}

export function updateAssetUsageScope(id: string, usageScope: AssetUsageScope) {
  const database = getDb();
  const asset = getAsset(id);

  if (!asset) {
    return null;
  }

  database.prepare("UPDATE assets SET usage_scope = ? WHERE id = ?").run(usageScope, id);
  return getAsset(id);
}

export function incrementContentViewCount(id: string) {
  const database = getDb();
  const content = getContentById(id);

  if (!content) {
    return null;
  }

  database.prepare("UPDATE contents SET view_count = view_count + 1 WHERE id = ?").run(id);
  return getContentById(id);
}

export function deleteAsset(id: string) {
  const database = getDb();
  const asset = getAsset(id);

  if (!asset) {
    return { ok: false, reason: "missing" as const };
  }

  if (getAssetUsageCount(id) > 0) {
    return { ok: false, reason: "in-use" as const };
  }

  database.prepare("DELETE FROM assets WHERE id = ?").run(id);

  try {
    unlinkSync(asset.storagePath);
  } catch {
    // The database row is the source of truth; a missing file should not block cleanup.
  }

  return { ok: true, reason: null };
}

export function searchPublicContent(query: string) {
  return searchPublicContentWithScores(query).map((result) => result.item);
}

export function searchPublicContentWithScores(query: string, options: { type?: ContentType; limit?: number } = {}) {
  const tokens = tokenizeSearchQuery(query);
  const publicItems = listContents({ visibility: "public" }).filter((item) => !options.type || item.type === options.type);
  const limit = options.limit ?? 5;

  if (tokens.length === 0) {
    return publicItems.slice(0, limit).map((item, index) => ({
      item,
      score: Math.max(1, 5 - index),
      matches: [] as string[],
    }));
  }

  const scored = publicItems
    .map((item) => scoreContentItem(item, tokens))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.item.updatedAt) - Date.parse(a.item.updatedAt));

  return (scored.length > 0 ? scored : publicItems.slice(0, limit).map((item, index) => ({
    item,
    score: Math.max(0.5, 2 - index * 0.2),
    matches: [] as string[],
  }))).slice(0, limit);
}

function tokenizeSearchQuery(query: string) {
  const normalized = query.trim().toLowerCase();
  const tokens = new Set<string>();

  for (const match of normalized.matchAll(/[a-z0-9_+-]+|[\u4e00-\u9fa5]{1,4}/g)) {
    const token = match[0].trim();
    if (token.length >= 2 || /[\u4e00-\u9fa5]/.test(token)) {
      tokens.add(token);
    }
  }

  for (const char of normalized.matchAll(/[\u4e00-\u9fa5]/g)) {
    tokens.add(char[0]);
  }

  return Array.from(tokens).filter((token) => !["推荐", "文章", "随机", "几篇", "一下", "关于"].includes(token));
}

function scoreContentItem(item: ContentItem, tokens: string[]) {
  let score = 0;
  const matches = new Set<string>();
  const fields = [
    { name: "title", text: item.title, weight: 10 },
    { name: "tag", text: item.tags.join(" "), weight: 8 },
    { name: "category", text: item.category, weight: 6 },
    { name: "summary", text: item.summary, weight: 5 },
    { name: "body", text: item.body.slice(0, 5000), weight: 2 },
  ];

  for (const token of tokens) {
    for (const field of fields) {
      if (field.text.toLowerCase().includes(token)) {
        score += field.weight;
        matches.add(token);
      }
    }
  }

  const daysSinceUpdate = Math.max(0, (Date.now() - Date.parse(item.updatedAt)) / 86400000);
  score += Math.max(0, 1.5 - daysSinceUpdate / 240);

  return {
    item,
    score,
    matches: Array.from(matches),
  };
}

export function recordChatRateLimit(bucketKey: string, limit = 30): ChatRateLimitResult {
  const database = getDb();
  const safeKey = bucketKey.trim().slice(0, 180) || "anonymous";
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
  const existing = database
    .prepare("SELECT count FROM chat_rate_limits WHERE bucket_key = ? AND day = ?")
    .get(safeKey, day) as { count: number } | undefined;

  if (existing && existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt,
    };
  }

  const nextCount = (existing?.count ?? 0) + 1;
  database
    .prepare(
      `
      INSERT INTO chat_rate_limits (bucket_key, day, count, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(bucket_key, day) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at
    `,
    )
    .run(safeKey, day, nextCount, now.toISOString());

  return {
    allowed: true,
    remaining: Math.max(0, limit - nextCount),
    limit,
    resetAt,
  };
}

export function recordVisitRateLimit(bucketKey: string, limit = 120) {
  return recordChatRateLimit(`visit:${bucketKey}`, limit);
}

export function recordSiteVisit(input: {
  path: string;
  ipAddress?: string;
  userAgent?: string;
  visitorId?: string;
  eventType?: "site" | "page";
  geo?: VisitGeo;
}) {
  const safePath = input.path.trim().slice(0, 300) || "/";
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const eventType = input.eventType ?? "site";
  const safeIpAddress = input.ipAddress?.trim().slice(0, 80) ?? "";
  const safeVisitorId = input.visitorId?.trim().slice(0, 80) ?? "";
  const safeUserAgent = input.userAgent?.trim().slice(0, 500) ?? "";
  const country = input.geo?.country?.trim().slice(0, 80) ?? "";
  const region = input.geo?.region?.trim().slice(0, 80) ?? "";
  const city = input.geo?.city?.trim().slice(0, 80) ?? "";
  const latitude = input.geo?.latitude ?? null;
  const longitude = input.geo?.longitude ?? null;
  const database = getDb();

  if (eventType === "site" && safeIpAddress) {
    const existing = database
      .prepare("SELECT id FROM site_visits WHERE event_type = 'site' AND ip_address = ? LIMIT 1")
      .get(safeIpAddress) as { id: string } | undefined;

    if (existing) {
      database
        .prepare(
          `
          UPDATE site_visits
          SET
            path = ?,
            visitor_id = CASE WHEN ? != '' THEN ? ELSE visitor_id END,
            user_agent = ?,
            country = CASE WHEN ? != '' THEN ? ELSE country END,
            region = CASE WHEN ? != '' THEN ? ELSE region END,
            city = CASE WHEN ? != '' THEN ? ELSE city END,
            latitude = COALESCE(?, latitude),
            longitude = COALESCE(?, longitude),
            created_at = ?
          WHERE id = ?
        `,
        )
        .run(
          safePath,
          safeVisitorId,
          safeVisitorId,
          safeUserAgent,
          country,
          country,
          region,
          region,
          city,
          city,
          latitude,
          longitude,
          now,
          existing.id,
        );

      return { id: existing.id, createdAt: now };
    }
  }

  database
    .prepare(
      `
      INSERT INTO site_visits (
        id, path, ip_address, visitor_id, event_type, user_agent, country, region, city, latitude, longitude, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      id,
      safePath,
      safeIpAddress,
      safeVisitorId,
      eventType,
      safeUserAgent,
      country,
      region,
      city,
      latitude,
      longitude,
      now,
    );

  return { id, createdAt: now };
}

export function listVisitorLocations() {
  const rows = getDb()
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(city, ''), NULLIF(region, ''), NULLIF(country, ''), '未知') AS city,
        MAX(country) AS country,
        MAX(region) AS region,
        AVG(latitude) AS latitude,
        AVG(longitude) AS longitude,
        COUNT(DISTINCT ip_address) AS count,
        MAX(created_at) AS lastSeenAt
      FROM site_visits
      WHERE event_type = 'site' AND ip_address != '' AND latitude IS NOT NULL AND longitude IS NOT NULL
      GROUP BY
        COALESCE(NULLIF(country, ''), '未知国家'),
        COALESCE(NULLIF(region, ''), '未知地区'),
        COALESCE(NULLIF(city, ''), '未知城市')
      ORDER BY count DESC, lastSeenAt DESC
      LIMIT 24
    `,
    )
    .all() as VisitorLocation[];

  return rows.map((row) => ({
    country: row.country,
    region: row.region,
    city: row.city,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    count: row.count,
    lastSeenAt: row.lastSeenAt,
  }));
}

export function createOnlineStatus(message: string) {
  const trimmed = message.trim().slice(0, 120);

  if (!trimmed) {
    return null;
  }

  const id = crypto.randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

  getDb()
    .prepare(
      `
      INSERT INTO online_statuses (id, message, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `,
    )
    .run(id, trimmed, createdAt.toISOString(), expiresAt.toISOString());

  return getOnlineStatus();
}

export function getOnlineStatus(): OnlineStatus | null {
  const database = getDb();
  const now = new Date().toISOString();

  database.prepare("DELETE FROM online_statuses WHERE expires_at <= ?").run(now);

  const row = database
    .prepare(
      `
      SELECT id, message, created_at AS createdAt, expires_at AS expiresAt
      FROM online_statuses
      WHERE expires_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    )
    .get(now) as OnlineStatus | undefined;

  return row
    ? {
        id: row.id,
        message: row.message,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      }
    : null;
}

export function clearOnlineStatus() {
  getDb().prepare("DELETE FROM online_statuses").run();
}

export function getSiteSetting(key: string, fallback = ""): SiteSetting {
  const safeKey = key.trim().slice(0, 80);
  const row = getDb()
    .prepare(
      `
      SELECT key, value, updated_at AS updatedAt
      FROM site_settings
      WHERE key = ?
    `,
    )
    .get(safeKey) as SiteSetting | undefined;

  return row ?? { key: safeKey, value: fallback, updatedAt: "" };
}

export function upsertSiteSetting(key: string, value: string) {
  const safeKey = key.trim().slice(0, 80);
  const safeValue = value.trim().slice(0, 160);
  const updatedAt = new Date().toISOString();

  getDb()
    .prepare(
      `
      INSERT INTO site_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    )
    .run(safeKey, safeValue, updatedAt);

  return getSiteSetting(safeKey);
}

function ensureCategory(database: DatabaseSync, name: string, description = "") {
  return ensureTaxonomy(database, "categories", name, description);
}

function ensureTag(database: DatabaseSync, name: string, description = "") {
  return ensureTaxonomy(database, "tags", name, description);
}

function ensureTaxonomy(database: DatabaseSync, table: "categories" | "tags", name: string, description = "") {
  const normalizedName = normalizeTaxonomyName(name);
  const existing = database
    .prepare(
      `
      SELECT id, name, slug, description, created_at AS createdAt
      FROM ${table}
      WHERE name = ?
    `,
    )
    .get(normalizedName) as TaxonomyRow | undefined;

  if (existing) {
    return mapTaxonomyRow(existing);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = createTaxonomySlug(normalizedName, id);

  database
    .prepare(
      `
      INSERT INTO ${table} (id, name, slug, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    )
    .run(id, normalizedName, slug, description.trim(), now);

  return {
    id,
    name: normalizedName,
    slug,
    description: description.trim(),
    createdAt: now,
  };
}

function safeParseTags(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function createSlug(title: string, id: string) {
  const asciiSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return asciiSlug || `content-${id.slice(0, 8)}`;
}

function createTaxonomySlug(name: string, id: string) {
  const asciiSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return asciiSlug || `taxonomy-${id.slice(0, 8)}`;
}

function normalizeDateInput(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeTaxonomyName(name: string) {
  const trimmed = name.trim();
  return trimmed || defaultCategoryName;
}
