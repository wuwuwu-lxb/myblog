import Link from "next/link";
import { BookOpenText, MapPinned, Radio } from "lucide-react";
import { BilibiliBrandIcon, GitHubBrandIcon } from "./BrandIcons";
import { HomeRealtime } from "./HomeRealtime";
import { TransitionLink } from "./TransitionLink";
import { VisitorMapClient } from "./VisitorMapClient";
import { getOnlineStatus, getSiteStats, listContentSummaries, listVisitorLocations, type VisitorLocation } from "@/lib/db";
import { getTailscaleStatus } from "@/lib/tailscale";

const githubUrl = "https://github.com/wuwuwu-lxb";
const bilibiliUrl = "https://space.bilibili.com/3537124569647330";
const previewVisitorLocation: VisitorLocation = {
  country: "中国",
  region: "浙江",
  city: "杭州",
  latitude: 30.2741,
  longitude: 120.1551,
  count: 1,
  lastSeenAt: "2026-06-10T00:00:00.000Z",
};

export default async function HomePage() {
  const publicContent = listContentSummaries().filter((item) => item.visibility === "public");
  const stats = getSiteStats();
  const onlineStatus = getOnlineStatus();
  const tailscaleStatus = await getTailscaleStatus();
  const visitorLocations = listVisitorLocations();
  const mapLocations =
    visitorLocations.length > 0 || process.env.NODE_ENV === "production" ? visitorLocations : [previewVisitorLocation];
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
                    : "工作台可以发布 24 小时状态"}
                </small>
                <span className="device-status-summary">
                  <span>{tailscaleStatus.onlineCount}</span>
                  <small>在线 / {tailscaleStatus.totalCount} 台设备</small>
                </span>
                {tailscaleStatus.devices.length > 0 ? (
                  <span className="device-status-list">
                    {tailscaleStatus.devices.map((device) => (
                      <span className="device-status-row" key={device.id}>
                        <i data-online={device.online} />
                        <span>{device.name}</span>
                        <em>{device.os}</em>
                      </span>
                    ))}
                  </span>
                ) : (
                  <small>{tailscaleStatus.configured ? "暂时没有可展示设备" : "Tailscale API 未配置"}</small>
                )}
              </span>
            </span>
          </div>
          <h1>唔唔唔</h1>
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
        <VisitorMapClient locations={mapLocations} />
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
            <TransitionLink
              className="home-timeline-item"
              href={item.type === "post" ? `/blog/${item.slug}` : `/diary?date=${item.publishedAt.slice(0, 10)}`}
              sharedScope={item.type === "post" ? "article" : undefined}
              key={item.id}
            >
              <span>{item.publishedAt.slice(5, 10)}</span>
              <strong data-shared-key={item.type === "post" ? "article-title" : undefined}>{item.title}</strong>
              <em>{item.type === "post" ? "Posts" : "Notes"}</em>
            </TransitionLink>
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
