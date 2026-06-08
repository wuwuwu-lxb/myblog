import { existsSync, mkdirSync } from "node:fs";
import { unlinkSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Visibility = "private" | "draft" | "public";
export type ContentType = "entry" | "note" | "post" | "memory";

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
  createdAt: string;
  updatedAt: string;
  assets: MediaAsset[];
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
  createdAt: string;
  updatedAt: string;
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
      cover_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_assets (
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      PRIMARY KEY (content_id, asset_id)
    );
  `);

  const columns = database.prepare("PRAGMA table_info(contents)").all() as { name: string }[];
  const hasCategory = columns.some((column) => column.name === "category");
  const hasCategoryId = columns.some((column) => column.name === "category_id");
  const hasCoverAssetId = columns.some((column) => column.name === "cover_asset_id");

  if (!hasCategory) {
    database.exec("ALTER TABLE contents ADD COLUMN category TEXT NOT NULL DEFAULT '未分类';");
  }

  if (!hasCategoryId) {
    database.exec("ALTER TABLE contents ADD COLUMN category_id TEXT REFERENCES categories(id) ON DELETE SET NULL;");
  }

  if (!hasCoverAssetId) {
    database.exec("ALTER TABLE contents ADD COLUMN cover_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL;");
  }
}

function seed(database: DatabaseSync) {
  const count = database.prepare("SELECT COUNT(*) AS count FROM contents").get() as { count: number };

  ensureCategory(database, defaultCategoryName);
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

  if (count.count > 0) {
    return;
  }

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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
    createdAt: row.createdAt,
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
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
      FROM contents c
      LEFT JOIN categories cat ON cat.id = c.category_id
      ${where}
      ORDER BY c.updated_at DESC
    `,
    )
    .all(...params) as ContentRow[];

  return rows.map(mapContentRow);
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
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
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
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
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
  assetIds?: string[];
}) {
  return createContentWithDb(getDb(), {
    ...input,
    id: crypto.randomUUID(),
    slug: createSlug(input.title, crypto.randomUUID()),
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
    assetIds?: string[];
  },
) {
  const database = getDb();
  const existing = getContentById(id);

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const category = getCategoryWithDb(database, input.categoryId) ?? ensureCategory(database, defaultCategoryName);
  const tagItems = input.tagIds
    .map((tagId) => getTag(tagId))
    .filter((tag): tag is TaxonomyItem => Boolean(tag));
  const summary = input.summary?.trim() || input.body.trim().slice(0, 120);

  database
    .prepare(
      `
      UPDATE contents
      SET type = ?, title = ?, category = ?, category_id = ?, summary = ?, body = ?, tags_json = ?, visibility = ?, updated_at = ?
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
    assetIds?: string[];
  },
) {
  const now = new Date().toISOString();
  const category = getCategoryWithDb(database, input.categoryId) ?? ensureCategory(database, defaultCategoryName);
  const tagItems = input.tags.map((tagName) => ensureTag(database, tagName));
  const summary = input.summary?.trim() || input.body.trim().slice(0, 120);

  database
    .prepare(
      `
      INSERT INTO contents (
        id, type, title, slug, category, category_id, summary, body, tags_json, visibility, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      now,
      now,
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

  const deleteLinks = database.prepare("DELETE FROM content_tags WHERE tag_id = ?");
  const deleteTag = database.prepare("DELETE FROM tags WHERE id = ?");
  let deleted = 0;

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
        created_at AS createdAt
      FROM assets
      ORDER BY created_at DESC
    `,
    )
    .all() as AssetRow[];

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
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `
      INSERT INTO assets (
        id, file_name, mime_type, size_bytes, storage_path, alt, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(id, input.fileName, input.mimeType, input.sizeBytes, input.storagePath, input.alt ?? "", now);

  return getAsset(id);
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
  const normalized = query.trim().toLowerCase();
  const publicItems = listContents({ visibility: "public" });

  if (!normalized) {
    return publicItems.slice(0, 3);
  }

  const matched = publicItems.filter((item) =>
    [item.title, item.category, item.summary, item.body, ...item.tags].some((text) =>
      text.toLowerCase().includes(normalized),
    ),
  );

  return matched.length > 0 ? matched : publicItems.slice(0, 3);
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

function normalizeTaxonomyName(name: string) {
  const trimmed = name.trim();
  return trimmed || defaultCategoryName;
}
