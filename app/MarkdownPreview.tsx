type MarkdownPreviewProps = {
  content: string;
};

function isSafeUrl(url: string) {
  return url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://") || url.startsWith("mailto:");
}

function parseInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|!\[[^\]]*]\([^)]+\)|\[[^\]]+]\([^)]+\))/g);

  return parts.map((part, index) => {
    const image = part.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
    if (image) {
      if (!isSafeUrl(image[2])) {
        return image[1] || part;
      }

      return <img className="markdown-inline-image" src={image[2]} alt={image[1]} key={index} />;
    }

    const link = part.match(/^\[([^\]]+)]\(([^)]+)\)$/);
    if (link) {
      if (!isSafeUrl(link[2])) {
        return link[1];
      }

      return (
        <a href={link[2]} target="_blank" rel="noreferrer" key={index}>
          {link[1]}
        </a>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const blocks = content.trim().split(/\n{2,}/).filter(Boolean);

  if (blocks.length === 0) {
    return <p className="muted">预览会显示在这里。</p>;
  }

  return (
    <div className="markdown-preview">
      {blocks.map((block, index) => {
        if (block.startsWith("### ")) {
          return <h3 key={index}>{parseInline(block.slice(4))}</h3>;
        }

        if (block.startsWith("## ")) {
          return <h2 key={index}>{parseInline(block.slice(3))}</h2>;
        }

        if (block.startsWith("# ")) {
          return <h1 key={index}>{parseInline(block.slice(2))}</h1>;
        }

        if (block.startsWith("> ")) {
          return <blockquote key={index}>{parseInline(block.replace(/^> ?/gm, ""))}</blockquote>;
        }

        if (/^[-*] /m.test(block)) {
          return (
            <ul key={index}>
              {block
                .split("\n")
                .filter((line) => /^[-*] /.test(line))
                .map((line, lineIndex) => (
                  <li key={`${line}-${lineIndex}`}>{parseInline(line.slice(2))}</li>
                ))}
            </ul>
          );
        }

        return <p key={index}>{parseInline(block)}</p>;
      })}
    </div>
  );
}
