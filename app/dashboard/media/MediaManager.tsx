"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { MediaAsset } from "@/lib/db";

type MediaManagerProps = {
  initialAssets: MediaAsset[];
};

export function MediaManager({ initialAssets }: MediaManagerProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [status, setStatus] = useState("");

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
      <h2>媒体管理</h2>
      <div className="asset-strip media-library media-page-grid">
        {assets.map((asset) => (
          <figure key={asset.id}>
            <img src={`/assets/${asset.id}`} alt={asset.alt} />
            <figcaption>
              <span>{asset.fileName}</span>
              <button className="asset-action danger" type="button" onClick={() => deleteMediaAsset(asset)}>
                <Trash2 aria-hidden="true" size={13} />
                删除
              </button>
            </figcaption>
          </figure>
        ))}
        {assets.length === 0 ? <p className="muted">还没有上传图片。</p> : null}
      </div>
      {status ? <p className="muted">{status}</p> : null}
    </section>
  );
}
