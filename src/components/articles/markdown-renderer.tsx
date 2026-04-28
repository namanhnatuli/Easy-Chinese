import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "list"; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "paragraph"; content: string };

function parseInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const value = match[0];

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    if (value.startsWith("**") && value.endsWith("**")) {
      parts.push(
        <strong key={`${start}-bold`} className="font-semibold text-foreground">
          {value.slice(2, -2)}
        </strong>,
      );
    } else if (value.startsWith("*") && value.endsWith("*")) {
      parts.push(
        <em key={`${start}-italic`} className="italic text-foreground">
          {value.slice(1, -1)}
        </em>,
      );
    } else {
      parts.push(value);
    }

    lastIndex = start + value.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine) {
      index += 1;
      continue;
    }

    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        content: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length) {
        const line = lines[index].trim();
        if (!line.startsWith("- ")) {
          break;
        }
        items.push(line.slice(2).trim());
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (trimmedLine.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const line = lines[index].trim();
        if (!line.startsWith(">")) {
          break;
        }
        quoteLines.push(line.replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line) {
        break;
      }
      if (/^(#{1,3})\s+/.test(line) || line.startsWith("- ") || line.startsWith(">")) {
        break;
      }
      paragraphLines.push(line);
      index += 1;
    }
    blocks.push({ type: "paragraph", content: paragraphLines.join(" ") });
  }

  return blocks;
}

function Heading({
  level,
  children,
}: {
  level: 1 | 2 | 3;
  children: ReactNode;
}) {
  const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";

  return (
    <Tag
      className={cn(
        "font-semibold tracking-tight text-foreground",
        level === 1 && "text-3xl",
        level === 2 && "mt-8 text-2xl",
        level === 3 && "mt-6 text-xl",
      )}
    >
      {children}
    </Tag>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-4">
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          return (
            <Heading key={`heading-${blockIndex}`} level={block.level}>
              {parseInlineMarkdown(block.content)}
            </Heading>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${blockIndex}`} className="ml-5 list-disc space-y-2 text-sm leading-7 text-muted-foreground sm:text-base">
              {block.items.map((item, itemIndex) => (
                <li key={`list-item-${blockIndex}-${itemIndex}`}>{parseInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "blockquote") {
          return (
            <div
              key={`quote-${blockIndex}`}
              className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-7 text-foreground sm:text-base"
            >
              {block.lines.map((line, lineIndex) => (
                <p key={`quote-line-${blockIndex}-${lineIndex}`} className={lineIndex > 0 ? "mt-2" : undefined}>
                  {parseInlineMarkdown(line)}
                </p>
              ))}
            </div>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`} className="text-sm leading-7 text-muted-foreground sm:text-base">
            {parseInlineMarkdown(block.content)}
          </p>
        );
      })}
    </div>
  );
}
