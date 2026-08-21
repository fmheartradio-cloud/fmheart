import type { ReactNode } from "react";

/**
 * Isi/UN Basuru & Davasa lack GPOS, so below-base vowels (ු / ූ) detach
 * (e.g. රු, තු in උතුර). Keep the main Isi face; wrap only those clusters
 * in a shaping-capable face (AF Sigiri) without changing the headline font.
 *
 * Matches: consonant + optional rakaransaya/yansaya + ු|ූ
 */
const BELOW_VOWEL_CLUSTER =
  /([\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6](?:\u0DCA\u200D[\u0DBA\u0DBB])?[\u0DD4\u0DD6])/gu;

export function renderShapedSinhala(text: string, keyPrefix = "si"): ReactNode[] {
  const normalized = text.normalize("NFC");
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;

  for (const match of normalized.matchAll(BELOW_VOWEL_CLUSTER)) {
    const start = match.index ?? 0;
    const cluster = match[1] ?? match[0];
    if (start > last) {
      nodes.push(
        <span key={`${keyPrefix}-t-${i++}`}>{normalized.slice(last, start)}</span>,
      );
    }
    nodes.push(
      <span key={`${keyPrefix}-f-${i++}`} className="isi-shape-fix">
        {cluster}
      </span>,
    );
    last = start + cluster.length;
  }

  if (last < normalized.length) {
    nodes.push(
      <span key={`${keyPrefix}-t-${i++}`}>{normalized.slice(last)}</span>,
    );
  }

  return nodes.length ? nodes : [<span key={`${keyPrefix}-0`}>{normalized}</span>];
}
