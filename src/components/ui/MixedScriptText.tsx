import type { ReactNode } from "react";

type Segment = { kind: "si" | "en"; text: string };

/** Split Sinhala vs Latin/other so English can use Poppins Regular. */
export function splitSinhalaLatin(text: string): Segment[] {
  if (!text) return [];
  const parts: Segment[] = [];
  const re = /([\u0D80-\u0DFF\u200C\u200D]+)|([^\u0D80-\u0DFF\u200C\u200D]+)/gu;
  for (const match of text.matchAll(re)) {
    const si = match[1];
    const en = match[2];
    if (si) parts.push({ kind: "si", text: si });
    else if (en) parts.push({ kind: "en", text: en });
  }
  return parts.length ? parts : [{ kind: "en", text }];
}

type MixedScriptTextProps = {
  text: string;
  className?: string;
  /** Class for Latin/English runs (default: Poppins Regular 400). */
  latinClassName?: string;
};

/**
 * Renders mixed Sinhala + English titles.
 * Sinhala inherits parent Isi font; English uses Poppins Regular (400).
 */
export function MixedScriptText({
  text,
  className,
  latinClassName = "font-poppins font-normal",
}: MixedScriptTextProps) {
  const parts = splitSinhalaLatin(text);
  const nodes: ReactNode[] = parts.map((part, i) =>
    part.kind === "en" ? (
      <span key={i} className={latinClassName} style={{ fontWeight: 400 }}>
        {part.text}
      </span>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  );
  if (className) {
    return <span className={className}>{nodes}</span>;
  }
  return <>{nodes}</>;
}
