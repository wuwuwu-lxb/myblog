"use client";

import { useEffect, useState } from "react";
import type { MarkdownHeading } from "@/app/MarkdownPreview";

type ArticleTocProps = {
  headings: MarkdownHeading[];
};

export function ArticleToc({ headings }: ArticleTocProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) {
      return;
    }

    const headingElements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (headingElements.length === 0) {
      return;
    }

    function updateActiveHeading() {
      const viewportOffset = window.innerHeight * 0.28;
      const current =
        headingElements
          .filter((element) => element.getBoundingClientRect().top <= viewportOffset)
          .at(-1) ?? headingElements[0];

      setActiveId(current.id);
    }

    const observer = new IntersectionObserver(
      () => {
        updateActiveHeading();
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: [0, 1],
      },
    );

    headingElements.forEach((element) => observer.observe(element));
    updateActiveHeading();
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [headings]);

  return (
    <aside className="panel article-toc" aria-label="文章目录">
      <div className="board-header">
        <span>TOC</span>
        <strong>{headings.length}</strong>
      </div>
      <nav>
        {headings.map((heading) => (
          <a
            className={`toc-level-${heading.level} ${activeId === heading.id ? "active" : ""}`}
            href={`#${heading.id}`}
            key={heading.id}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}
