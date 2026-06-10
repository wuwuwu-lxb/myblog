"use client";

import { useEffect } from "react";

const focusedTitle = "欢迎来到小唔的小窝";
const blurredTitle = "要记得来看我哦！";

export function DynamicDocumentTitle() {
  useEffect(() => {
    function updateTitle() {
      document.title = document.visibilityState === "visible" && document.hasFocus() ? focusedTitle : blurredTitle;
    }

    updateTitle();
    window.addEventListener("focus", updateTitle);
    window.addEventListener("blur", updateTitle);
    document.addEventListener("visibilitychange", updateTitle);

    return () => {
      window.removeEventListener("focus", updateTitle);
      window.removeEventListener("blur", updateTitle);
      document.removeEventListener("visibilitychange", updateTitle);
    };
  }, []);

  return null;
}
