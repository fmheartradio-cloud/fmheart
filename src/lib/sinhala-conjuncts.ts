const SINHALA_CONS = "\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6";
const VIRAMA = "\\u0DCA";
const ZWJ = "\\u200D";
const YA = "\\u0DBA";
const RA = "\\u0DBB";

const REPHA_CONS = "\\u0D9A-\\u0DB1\\u0DB3-\\u0DB9\\u0DBD\\u0DC0-\\u0DC6";

const ZWJ_BEFORE_VIRAMA = new RegExp(`${ZWJ}+${VIRAMA}${ZWJ}*`, "g");
const RAKAR_OR_YANSA = new RegExp(
  `([${SINHALA_CONS}])${VIRAMA}${ZWJ}?([${YA}${RA}])`,
  "g",
);
const REPAYA = new RegExp(`${RA}${VIRAMA}${ZWJ}?([${REPHA_CONS}])`, "g");

/**
 * Isi/UN fonts only form rakaransaya (ක්‍ර), yansaya, and repaya when the
 * sequence is cons + virama + ZWJ + ra/ya. Feeds often drop ZWJ or put it
 * before the virama (ක‍්‍රි), which leaves ක්‍රි unshaped.
 */
export function normalizeSinhalaConjuncts(text: string): string {
  if (!text || !/[\u0D80-\u0DFF]/.test(text)) return text;

  let s = text.normalize("NFC");
  s = s.replace(ZWJ_BEFORE_VIRAMA, "\u0DCA\u200D");
  s = s.replace(RAKAR_OR_YANSA, "$1\u0DCA\u200D$2");
  s = s.replace(REPAYA, "\u0DBB\u0DCA\u200D$1");
  return s;
}
