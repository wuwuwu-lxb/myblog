import Link from "next/link";
import { Fingerprint, MessageSquareText } from "lucide-react";
import { listContents } from "@/lib/db";
import { personaSnapshot } from "@/lib/persona-design";

export default function HomePage() {
  const publicContent = listContents({ visibility: "public" });

  return (
    <div className="public-shell">
      <section className="persona-hero">
        <div className="hero-identity">
          <div className="hero-kicker">
            <Fingerprint aria-hidden="true" size={18} />
            <span>{personaSnapshot.role}</span>
          </div>
          <h1>{personaSnapshot.name}</h1>
          <p className="hero-statement">{personaSnapshot.headline}</p>
          <div className="hero-actions">
            <Link className="button primary" href="/self">
              <MessageSquareText aria-hidden="true" size={18} />
              <span>向 self-LLM 提问</span>
            </Link>
          </div>
        </div>

        <aside className="signal-board" aria-label="人格状态面板">
          <div className="board-header">
            <span>PUBLIC SELF</span>
            <strong>{publicContent.length.toString().padStart(2, "0")} sources</strong>
          </div>
          <strong className="signal-title">self-LLM</strong>
          <p className="signal-copy">公开人格接口</p>
        </aside>
      </section>
    </div>
  );
}
