"use client";

import { useEffect } from "react";

const visitorIdKey = "llm-selfwiki-visitor-id";
const sessionVisitKey = "llm-selfwiki-site-visit-recorded";

export function VisitTracker() {
  useEffect(() => {
    if (window.sessionStorage.getItem(sessionVisitKey)) {
      return;
    }

    let visitorId = window.localStorage.getItem(visitorIdKey);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      window.localStorage.setItem(visitorIdKey, visitorId);
    }

    const path = `${window.location.pathname}${window.location.search}`;
    window.sessionStorage.setItem(sessionVisitKey, "1");

    void fetch("/api/visits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, visitorId, eventType: "site" }),
      keepalive: true,
    });
  }, []);

  return null;
}
