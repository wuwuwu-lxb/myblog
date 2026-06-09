"use client";

import { useEffect, useMemo, useState } from "react";

type HomeRealtimeProps = {
  startedAt: string;
  initialNow: string;
};

export function HomeRealtime({ startedAt, initialNow }: HomeRealtimeProps) {
  const [now, setNow] = useState(() => new Date(initialNow));
  const startDate = useMemo(() => new Date(startedAt), [startedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const nextYear = new Date(now.getFullYear() + 1, 0, 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dayOfYear = Math.floor((dayStart.getTime() - yearStart.getTime()) / 86400000) + 1;
  const yearProgress = progress(now, yearStart, nextYear);
  const dayProgress = progress(now, dayStart, nextDay);
  const runtime = formatRuntime(now.getTime() - startDate.getTime());

  return (
    <section className="panel home-time-panel">
      <div className="board-header">
        <span>TIME</span>
        <strong>{now.getFullYear()}</strong>
      </div>
      <h2 className="time-glow-title">珍惜当下</h2>
      <div className="time-lines">
        <p>今天是 {now.getFullYear()} 年的第 {dayOfYear} 天</p>
        <p>
          今年已过 <span>{yearProgress.toFixed(8)}%</span>
        </p>
        <p>
          今天已过 <span>{dayProgress.toFixed(8)}%</span>
        </p>
        <p>本站运行 {runtime}</p>
      </div>
    </section>
  );
}

function progress(current: Date, start: Date, end: Date) {
  return ((current.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
}

function formatRuntime(durationMs: number) {
  const safeDuration = Math.max(0, durationMs);
  const days = Math.floor(safeDuration / 86400000);
  const hours = Math.floor((safeDuration % 86400000) / 3600000);
  const minutes = Math.floor((safeDuration % 3600000) / 60000);
  const seconds = Math.floor((safeDuration % 60000) / 1000);

  return `${days} 天 ${hours} 时 ${minutes} 分 ${seconds} 秒`;
}
