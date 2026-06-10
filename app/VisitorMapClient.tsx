"use client";

import dynamic from "next/dynamic";
import type { VisitorLocation } from "@/lib/db";

type VisitorMapClientProps = {
  locations: VisitorLocation[];
};

const LazyVisitorMap = dynamic(() => import("./VisitorMap").then((module) => module.VisitorMap), {
  ssr: false,
  loading: () => <VisitorMapSkeleton />,
});

export function VisitorMapClient({ locations }: VisitorMapClientProps) {
  return <LazyVisitorMap locations={locations} />;
}

function VisitorMapSkeleton() {
  return (
    <div className="visitor-map visitor-map-loading" aria-label="访客地图加载中">
      <div className="visitor-map-loading-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
