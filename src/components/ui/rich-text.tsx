import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Sehr einfache, sichere Textformatierung (kein HTML):
//   "- Punkt"    → Aufzählung
//   "1. Punkt"   → nummerierte Liste
//   **fett**     → fett
//   Leerzeile    → neuer Absatz

type Block =
  | { type: "p"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[]; start: number };

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-•*]\s+(.*)$/.exec(line);
    const numbered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);

    if (line.trim() === "") {
      flush();
    } else if (bullet) {
      if (current?.type !== "ul") {
        flush();
        current = { type: "ul", items: [] };
      }
      (current as Extract<Block, { type: "ul" }>).items.push(bullet[1]);
    } else if (numbered) {
      if (current?.type !== "ol") {
        flush();
        current = { type: "ol", items: [], start: Number(numbered[1]) };
      }
      (current as Extract<Block, { type: "ol" }>).items.push(numbered[2]);
    } else {
      if (current?.type !== "p") {
        flush();
        current = { type: "p", lines: [] };
      }
      (current as Extract<Block, { type: "p" }>).lines.push(line);
    }
  }
  flush();
  return blocks;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold text-bone">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-2 text-sm leading-relaxed text-bone/85", className)}>
      {parse(text).map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 marker:text-blood-bright">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} start={block.start} className="list-decimal space-y-1 pl-5 marker:text-brass">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
