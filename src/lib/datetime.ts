const SL_TZ = "Asia/Colombo";

/**
 * Sri Lanka local time with AM/PM, e.g. "July 28, 2026 1:40 PM".
 */
export function formatSriLankaDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const datePart = d.toLocaleDateString("en-US", {
    timeZone: SL_TZ,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    timeZone: SL_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} ${timePart}`;
}
