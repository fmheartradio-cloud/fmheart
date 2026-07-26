/** Sinhala Unicode block (U+0D80–U+0DFF). */
const SINHALA_CHAR = /[\u0D80-\u0DFF]/g;
const LETTER = /\p{L}/gu;

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

/**
 * True when text is meaningfully Sinhala-script:
 * - at least 3 Sinhala block characters, OR
 * - Sinhala letters are >= half of all Unicode letters in the string.
 */
export function hasSinhalaScript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const sinhalaChars = countMatches(trimmed, SINHALA_CHAR);
  if (sinhalaChars >= 3) return true;

  const letters = trimmed.match(LETTER) ?? [];
  if (letters.length === 0) return false;

  const sinhalaLetters = letters.filter((ch) => /[\u0D80-\u0DFF]/.test(ch)).length;
  return sinhalaLetters >= 1 && sinhalaLetters / letters.length >= 0.5;
}

/** Public news listings: title must qualify; excerpt can support short titles. */
export function hasSinhalaNewsText(title: string, excerpt?: string): boolean {
  if (hasSinhalaScript(title)) return true;
  const combined = `${title.trim()} ${(excerpt ?? "").trim()}`.trim();
  return combined !== title.trim() && hasSinhalaScript(combined);
}
