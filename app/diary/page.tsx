import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import { MarkdownPreview } from "@/app/MarkdownPreview";
import { listContents, type ContentItem } from "@/lib/db";

type DiaryPageProps = {
  searchParams: Promise<{
    date?: string;
  }>;
};

export const dynamic = "force-dynamic";

function toDay(value: string) {
  return value.slice(0, 10);
}

function formatDateLabel(day: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${day}T00:00:00`));
}

function getTodayInShanghai() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDiaryItems() {
  const contents = listContents({ visibility: "public" });
  return contents
    .filter((item) => item.type === "entry" || item.category === "日记")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function groupByDay(items: ContentItem[]) {
  const groups = new Map<string, ContentItem[]>();

  for (const item of items) {
    const day = toDay(item.publishedAt);
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([day, dayItems]) => ({
    day,
    items: dayItems.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  }));
}

export default async function DiaryPage({ searchParams }: DiaryPageProps) {
  const { date } = await searchParams;
  const diaryItems = getDiaryItems();
  const groups = groupByDay(diaryItems);
  const today = getTodayInShanghai();
  const requestedDay = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  const selectedDay = groups.some((group) => group.day === requestedDay)
    ? requestedDay
    : groups[0]?.day;
  const selectedItems = selectedDay
    ? groups.find((group) => group.day === selectedDay)?.items ?? []
    : [];

  return (
    <div className="public-shell">
      <section className="diary-shell">
        <aside className="diary-calendar panel" aria-label="日记日期">
          <div className="board-header">
            <span>DIARY</span>
            <strong>{groups.length.toString().padStart(2, "0")} days</strong>
          </div>
          <div className="diary-days">
            {groups.map((group) => {
              const isActive = group.day === selectedDay;

              return (
                <Link
                  className={`diary-day ${isActive ? "active" : ""}`}
                  href={`/diary?date=${group.day}`}
                  key={group.day}
                >
                  <CalendarDays aria-hidden="true" size={17} />
                  <span>
                    <strong>{formatDateLabel(group.day)}</strong>
                    <small>{group.day}</small>
                  </span>
                  <em>{group.items.length}</em>
                </Link>
              );
            })}
            {groups.length === 0 ? <p className="muted">还没有公开日记。</p> : null}
          </div>
        </aside>

        <article className="diary-detail panel">
          {selectedDay && selectedItems.length > 0 ? (
            <>
              <div className="module-meta">
                <span>
                  <CalendarDays aria-hidden="true" size={13} />
                  {formatDateLabel(selectedDay)}
                </span>
                <span>{selectedItems.length} 条记录</span>
              </div>
              <h1>{selectedDay}</h1>
              <div className="diary-timeline">
                {selectedItems.map((item) => (
                  <section className="diary-entry" key={item.id}>
                    <div className="module-meta">
                      <span>
                        <Clock3 aria-hidden="true" size={13} />
                        发布 {item.publishedAt.slice(11, 16)}
                      </span>
                      <span>修改 {item.updatedAt.slice(0, 10)}</span>
                      <span>{item.category}</span>
                    </div>
                    <h2>{item.title}</h2>
                    {item.summary ? <p className="lead">{item.summary}</p> : null}
                    <div className="diary-body">
                      <MarkdownPreview content={item.body} />
                    </div>
                    {item.tags.length > 0 ? (
                      <div className="tag-row">
                        {item.tags.map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">还没有公开日记。</p>
          )}
        </article>
      </section>
    </div>
  );
}
