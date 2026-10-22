const SL_TZ = "Asia/Colombo";

export const SRI_LANKA_TZ = SL_TZ;

export function sriLankaNowParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: SL_TZ,
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const dateLabel = `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`;
  const timeLabel = `${parts.hour}:${parts.minute} ${String(parts.dayPeriod || "").toUpperCase()}`;
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: SL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return { dateLabel, timeLabel, dayKey };
}

export function formatSriLankaShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    timeZone: SL_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

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
