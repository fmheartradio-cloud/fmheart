import type { ReactNode } from "react";
import { renderShapedSinhala } from "@/components/ui/shapedSinhala";

type Segment = { kind: "si" | "en"; text: string };

/** Split Sinhala vs Latin/other so English can use Poppins ExtraBold. */
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
  /** Class for Latin/English runs (default: Poppins ExtraBold 800). */
  latinClassName?: string;
  /** Inline weight for Latin runs. */
  latinWeight?: number;
};

/**
 * Renders mixed Sinhala + English titles.
 * Sinhala stays on parent Isi font; රු/තු clusters get shaping fix;
 * English uses Poppins ExtraBold (800) by default.
 */
export function MixedScriptText({
  text,
  className,
  latinClassName = "font-poppins font-extrabold",
  latinWeight = 800,
}: MixedScriptTextProps) {
  const parts = splitSinhalaLatin(text);
  const nodes: ReactNode[] = parts.map((part, i) =>
    part.kind === "en" ? (
      <span key={`en-${i}`} className={latinClassName} style={{ fontWeight: latinWeight }}>
        {part.text}
      </span>
    ) : (
      <span key={`si-${i}`}>{renderShapedSinhala(part.text, `si-${i}`)}</span>
    ),
  );
  if (className) {
    return <span className={className}>{nodes}</span>;
  }
  return <>{nodes}</>;
}
