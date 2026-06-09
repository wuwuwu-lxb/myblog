"use client";

import { useMemo, useState } from "react";
import { Repeat2, Trash2 } from "lucide-react";
import type { AssetUsageScope, MediaAsset } from "@/app/client-types";

type MediaManagerProps = {
  initialAssets: MediaAsset[];
};

type ScopeFilter = "all" | AssetUsageScope;

export function MediaManager({ initialAssets }: MediaManagerProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [status, setStatus] = useState("");

  const filteredAssets = useMemo(
    () => assets.filter((asset) => scopeFilter === "all" || asset.usageScope === scopeFilter),
    [assets, scopeFilter],
  );

  async function updateUsageScope(asset: MediaAsset, usageScope: AssetUsageScope) {
    const response = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ usageScope }),
    });
    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error ?? "媒体属性更新失败。");
      return;
    }

    setAssets((current) => current.map((item) => (item.id === asset.id ? result.asset : item)));
    setStatus(`已更新图片属性：${result.asset.fileName}`);
  }

  async function deleteMediaAsset(asset: MediaAsset) {
    if (!window.confirm(`确认删除图片「${asset.fileName}」？`)) {
      return;
    }

    const response = await fetch(`/api/assets/${asset.id}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error ?? "图片删除失败。");
      return;
    }

    setAssets((current) => current.filter((item) => item.id !== asset.id));
    setStatus(`已删除图片：${asset.fileName}`);
  }

  return (
    <section className="section panel">
      <div className="manager-head">
        <h2>媒体管理</h2>
        <div className="manager-filters">
          <select
            className="input"
            value={scopeFilter}
            onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
          >
            <option value="all">全部图片</option>
            <option value="inline">一次性</option>
            <option value="reusable">可复用</option>
          </select>
        </div>
      </div>

      <div className="asset-strip media-library media-page-grid">
        {filteredAssets.map((asset) => (
          <figure key={asset.id}>
            <img src={`/assets/${asset.id}`} alt={asset.alt} />
            <figcaption>
              <span>{asset.fileName}</span>
              <div className="asset-state-row">
                <small>{asset.usageScope === "reusable" ? "可复用" : "一次性"}</small>
                <small>{Math.round(asset.sizeBytes / 1024)} KB</small>
              </div>
              <select
                className="input compact-select"
                value={asset.usageScope}
                onChange={(event) => void updateUsageScope(asset, event.target.value as AssetUsageScope)}
              >
                <option value="inline">一次性</option>
                <option value="reusable">可复用</option>
              </select>
              <button className="asset-action" type="button" onClick={() => void updateUsageScope(asset, "reusable")}>
                <Repeat2 aria-hidden="true" size={13} />
                设为复用
              </button>
              <button className="asset-action danger" type="button" onClick={() => deleteMediaAsset(asset)}>
                <Trash2 aria-hidden="true" size={13} />
                删除
              </button>
            </figcaption>
          </figure>
        ))}
        {filteredAssets.length === 0 ? <p className="muted">没有符合筛选条件的图片。</p> : null}
      </div>
      {status ? <p className="muted">{status}</p> : null}
    </section>
  );
}
