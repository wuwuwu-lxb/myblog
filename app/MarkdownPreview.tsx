import type { ReactNode } from "react";

type MarkdownPreviewProps = {
  content: string;
};

export type MarkdownHeading = {
  id: string;
  level: number;
  text: string;
};

function isSafeUrl(url: string) {
  return url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://") || url.startsWith("mailto:");
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[`*_~#]/g, "")
    .trim();
}

function createHeadingId(text: string, index: number) {
  const slug = stripInlineMarkdown(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `heading-${index + 1}`;
}

export function extractMarkdownHeadings(content: string) {
  const headings: MarkdownHeading[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (!heading) {
      continue;
    }

    headings.push({
      id: createHeadingId(heading[2], headings.length),
      level: heading[1].length,
      text: stripInlineMarkdown(heading[2]),
    });
  }

  return headings;
}

function parseInline(text: string): ReactNode[] {
  const parts = text.split(
    /(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|!\[[^\]]*]\([^)]+\)|\[[^\]]+]\([^)]+\)|\*[^*]+\*)/g,
  );

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

    if (part.startsWith("~~") && part.endsWith("~~")) {
      return <del key={index}>{part.slice(2, -2)}</del>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}

function isHorizontalRule(line: string) {
  return /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim());
}

function isTableStart(lines: string[], index: number) {
  const current = lines[index]?.trim();
  const next = lines[index + 1]?.trim();

  return Boolean(
    current?.includes("|") &&
      next?.includes("|") &&
      /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next),
  );
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isListLine(line: string) {
  return /^(\s*[-*]\s+|\s*\d+\.\s+)/.test(line);
}

function renderList(lines: string[], key: number) {
  const ordered = lines.every((line) => /^\s*\d+\.\s+/.test(line));
  const items = lines.map((line) => line.replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag key={key}>
      {items.map((item, index) => {
        const task = item.match(/^\[([ xX])]\s+(.+)$/);

        if (task) {
          return (
            <li className="task-item" key={`${item}-${index}`}>
              <input type="checkbox" checked={task[1].toLowerCase() === "x"} readOnly />
              <span>{parseInline(task[2])}</span>
            </li>
          );
        }

        return <li key={`${item}-${index}`}>{parseInline(item)}</li>;
      })}
    </Tag>
  );
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  const paragraph: string[] = [];
  let index = 0;
  let headingIndex = 0;

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }

    const text = paragraph.join("\n").trim();
    if (text) {
      nodes.push(<p key={`p-${nodes.length}`}>{parseInline(text)}</p>);
    }
    paragraph.length = 0;
  }

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    const codeFence = trimmed.match(/^```([a-zA-Z0-9_-]+)?/);
    if (codeFence) {
      flushParagraph();
      const language = codeFence[1] ?? "code";
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      nodes.push(
        <figure className="markdown-code-block" key={`code-${nodes.length}`}>
          <figcaption>{language}</figcaption>
          <pre>
            <code>{codeLines.join("\n")}</code>
          </pre>
        </figure>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const text = heading[2];
      const id = level >= 2 && level <= 4 ? createHeadingId(text, headingIndex) : undefined;
      headingIndex += id ? 1 : 0;
      const HeadingTag = `h${level}` as "h1" | "h2" | "h3" | "h4";

      nodes.push(
        <HeadingTag id={id} key={`heading-${nodes.length}`}>
          {parseInline(text)}
        </HeadingTag>,
      );
      index += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      flushParagraph();
      nodes.push(<hr key={`hr-${nodes.length}`} />);
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      nodes.push(<blockquote key={`quote-${nodes.length}`}>{parseInline(quoteLines.join("\n"))}</blockquote>);
      continue;
    }

    if (isTableStart(lines, index)) {
      flushParagraph();
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const headers = splitTableRow(tableLines[0]);
      const rows = tableLines.slice(2).map(splitTableRow);

      nodes.push(
        <div className="markdown-table-wrap" key={`table-${nodes.length}`}>
          <table>
            <thead>
              <tr>
                {headers.map((header, headerIndex) => (
                  <th key={`${header}-${headerIndex}`}>{parseInline(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${cell}-${cellIndex}`}>{parseInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (isListLine(line)) {
      flushParagraph();
      const listLines: string[] = [];
      while (index < lines.length && isListLine(lines[index])) {
        listLines.push(lines[index]);
        index += 1;
      }
      nodes.push(renderList(listLines, nodes.length));
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph();

  if (nodes.length === 0) {
    return <p className="muted">预览会显示在这里。</p>;
  }

  return <div className="markdown-preview">{nodes}</div>;
}
