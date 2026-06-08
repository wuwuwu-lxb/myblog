"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ColorMode = "light" | "dark";

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

  return (
    <div className="nav-theme-controls" aria-label="全局主题">
      <div className="mode-toggle" aria-label="浅色和深色切换">
        <button
          aria-label="切换到浅色模式"
          aria-pressed={mode === "light"}
          className="mode-button"
          onClick={() => setMode("light")}
          type="button"
        >
          <Sun aria-hidden="true" size={15} />
        </button>
        <button
          aria-label="切换到深色模式"
          aria-pressed={mode === "dark"}
          className="mode-button"
          onClick={() => setMode("dark")}
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
