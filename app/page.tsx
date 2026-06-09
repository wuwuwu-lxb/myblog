import Link from "next/link";
import { BookOpenText, MapPinned, Radio } from "lucide-react";
import { BilibiliBrandIcon, GitHubBrandIcon } from "./BrandIcons";
import { HomeRealtime } from "./HomeRealtime";
import { VisitorMap } from "./VisitorMap";
import { getOnlineStatus, getSiteStats, listContentSummaries, listVisitorLocations } from "@/lib/db";

const githubUrl = "https://github.com/wuwuwu-lxb";
const bilibiliUrl = "https://space.bilibili.com/3537124569647330";

export default function HomePage() {
  const publicContent = listContentSummaries().filter((item) => item.visibility === "public");
  const stats = getSiteStats();
  const onlineStatus = getOnlineStatus();
  const visitorLocations = listVisitorLocations();
  const timeline = publicContent.slice(0, 18);
  const initialNow = new Date().toISOString();

  return (
    <div className="public-shell home-shell">
      <section className="home-profile-grid">
        <article className="panel home-profile-card">
          <div className="home-avatar-wrap">
            <span className="home-avatar" aria-hidden="true" />
            <span className="home-online-dot" aria-label="在线状态">
              <span className="home-online-popover">
                <strong>{onlineStatus ? onlineStatus.message : "当前没有公开状态"}</strong>
                <small>
                  {onlineStatus
                    ? `发布于 ${onlineStatus.createdAt.slice(5, 16).replace("T", " ")}，24 小时后自动过期`
                    : "设备状态预留：后续接入 Tailscale"}
                </small>
                <small>设备：Tailscale 接入预留</small>
              </span>
            </span>
          </div>
          <h1>wuwuwu</h1>
          <p>Coding the world.</p>
          <div className="home-socials">
            <a href={githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub">
              <GitHubBrandIcon />
            </a>
            <a href={bilibiliUrl} target="_blank" rel="noreferrer" aria-label="Bilibili">
              <BilibiliBrandIcon />
            </a>
          </div>
        </article>

        <section className="home-overview">
          <HomeRealtime startedAt={stats.startedAt} initialNow={initialNow} />
          <div className="panel home-stat-grid">
            <div>
              <span>总文章</span>
              <strong>{stats.totalPublicContent}</strong>
            </div>
            <div>
              <span>博客</span>
              <strong>{stats.totalPosts}</strong>
            </div>
            <div>
              <span>日记</span>
              <strong>{stats.totalDiaryEntries}</strong>
            </div>
            <div>
              <span>访问</span>
              <strong>{stats.totalVisits}</strong>
            </div>
            <div>
              <span>访客</span>
              <strong>{stats.uniqueVisitors}</strong>
            </div>
            <div>
              <span>总字数</span>
              <strong>{stats.totalWords}</strong>
            </div>
          </div>
        </section>
      </section>

      <section className="section home-map-panel panel">
        <div className="board-header">
          <span>VISITORS</span>
          <strong>{visitorLocations.length}</strong>
        </div>
        <MapPinned aria-hidden="true" size={26} />
        <h2>访客地图</h2>
        {visitorLocations.length > 0 ? (
          <>
            <VisitorMap locations={visitorLocations} />
            <p>访问 IP 会尝试解析到城市级位置；内网、本机或解析失败的访问不会显示为地图点。</p>
          </>
        ) : (
          <div className="visitor-map-empty">
            <strong>等待公网访客</strong>
            <p>当前访问来自本机、内网或 GeoIP 解析失败，所以没有生成地图点。部署到公网后会自动记录真实位置。</p>
          </div>
        )}
      </section>

      <section className="section home-timeline panel">
        <div className="board-header">
          <span>TIMELINE</span>
          <strong>{timeline.length}</strong>
        </div>
        <h2>时间线</h2>
        <p className="muted">共有 {stats.totalPublicContent} 篇公开内容，再接再厉。</p>
        <div className="home-timeline-list">
          {timeline.map((item) => (
            <Link
              className="home-timeline-item"
              href={item.type === "post" ? `/blog/${item.slug}` : `/diary?date=${item.publishedAt.slice(0, 10)}`}
              key={item.id}
            >
              <span>{item.publishedAt.slice(5, 10)}</span>
              <strong>{item.title}</strong>
              <em>{item.type === "post" ? "Posts" : "Notes"}</em>
            </Link>
          ))}
          {timeline.length === 0 ? (
            <div className="home-timeline-empty">
              <Radio aria-hidden="true" size={18} />
              <span>还没有公开内容。</span>
            </div>
          ) : null}
        </div>
        <Link className="button ghost" href="/blog">
          <BookOpenText aria-hidden="true" size={17} />
          <span>查看全部博客</span>
        </Link>
      </section>
    </div>
  );
}
