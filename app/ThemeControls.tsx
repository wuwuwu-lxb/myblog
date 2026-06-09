"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

type ColorMode = "light" | "dark";
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void;
};

export function ThemeControls() {
  const [hue, setHue] = useState(166);
  const [mode, setMode] = useState<ColorMode>("light");

  useEffect(() => {
    const savedHue = window.localStorage.getItem("llm-selfwiki-theme-hue");
    const savedMode = window.localStorage.getItem("llm-selfwiki-theme-mode");

    if (savedHue) {
      const parsed = Number(savedHue);
      if (Number.isFinite(parsed)) {
        setHue(parsed);
      }
    }

    if (savedMode === "light" || savedMode === "dark") {
      setMode(savedMode);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--theme-hue", String(hue));
    window.localStorage.setItem("llm-selfwiki-theme-hue", String(hue));
  }, [hue]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem("llm-selfwiki-theme-mode", mode);
  }, [mode]);

  function changeMode(nextMode: ColorMode, event: React.MouseEvent<HTMLButtonElement>) {
    if (nextMode === mode) {
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const x = buttonRect.left + buttonRect.width / 2;
    const y = buttonRect.top + buttonRect.height / 2;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;

    root.style.setProperty("--theme-reveal-x", `${x}px`);
    root.style.setProperty("--theme-reveal-y", `${y}px`);
    root.style.setProperty("--theme-reveal-radius", `${endRadius}px`);

    const startViewTransition = (document as ViewTransitionDocument).startViewTransition;

    if (!startViewTransition) {
      setMode(nextMode);
      return;
    }

    startViewTransition.call(document, () => {
      flushSync(() => {
        setMode(nextMode);
      });
    });
  }

  return (
    <div className="nav-theme-controls" aria-label="全局主题">
      <div className="mode-toggle" aria-label="浅色和深色切换">
        <button
          aria-label="切换到浅色模式"
          aria-pressed={mode === "light"}
          className="mode-button"
          onClick={(event) => changeMode("light", event)}
          type="button"
        >
          <Sun aria-hidden="true" size={15} />
        </button>
        <button
          aria-label="切换到深色模式"
          aria-pressed={mode === "dark"}
          className="mode-button"
          onClick={(event) => changeMode("dark", event)}
          type="button"
        >
          <Moon aria-hidden="true" size={15} />
        </button>
      </div>
      <label className="hue-slider">
        <input
          aria-label="调整全局主题色"
          max="360"
          min="0"
          onChange={(event) => setHue(Number(event.target.value))}
          style={{ "--slider-hue": hue } as React.CSSProperties}
          type="range"
          value={hue}
        />
      </label>
    </div>
  );
}
