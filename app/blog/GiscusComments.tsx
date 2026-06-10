"use client";

import { useEffect, useRef } from "react";

type GiscusCommentsProps = {
  term: string;
};

export function GiscusComments({ term }: GiscusCommentsProps) {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "wuwuwu-lxb/myblog";
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID || "R_kgDOSwtm6Q";
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY || "Announcements";
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || "DIC_kwDOSwtm6c4C-0rz";
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function updateTheme() {
      const nextTheme = resolveTheme();
      const iframe = hostRef.current?.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
      iframe?.contentWindow?.postMessage(
        {
          giscus: {
            setConfig: {
              theme: nextTheme,
            },
          },
        },
        "https://giscus.app",
      );
    }

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const interval = window.setInterval(updateTheme, 400);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !repo || !repoId || !category || !categoryId) {
      return;
    }

    host.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", repo);
    script.setAttribute("data-repo-id", repoId);
    script.setAttribute("data-category", category);
    script.setAttribute("data-category-id", categoryId);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-term", term);
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", resolveTheme());
    script.setAttribute("data-lang", "zh-CN");
    script.setAttribute("data-loading", "lazy");
    host.appendChild(script);

    return () => {
      host.innerHTML = "";
    };
  }, [category, categoryId, repo, repoId, term]);

  if (!repo || !repoId || !category || !categoryId) {
    return (
      <section className="section panel">
        <h2>评论</h2>
        <p className="muted">giscus 还没有配置。配置 GitHub Discussions 后，这里会显示评论区。</p>
      </section>
    );
  }

  return (
    <section className="section panel giscus-panel">
      <h2>评论</h2>
      <div className="giscus-host" ref={hostRef} />
    </section>
  );
}

function resolveTheme() {
  return document.documentElement.dataset.theme === "dark" ? "transparent_dark" : "light";
}
