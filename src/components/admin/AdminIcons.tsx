import type { AdminNavItem } from "@/lib/admin-nav";

const stroke = {
  className: "h-[18px] w-[18px]",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function AdminNavIcon({ icon }: { icon: AdminNavItem["icon"] }) {
  switch (icon) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-7H10v7H5a1 1 0 0 1-1-1v-8.5Z" />
        </svg>
      );
    case "live":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M5 12a7 7 0 0 1 14 0" />
          <path d="M8 12a4 4 0 0 1 8 0" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "now":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M9 18V6l10 6-10 6Z" />
        </svg>
      );
    case "news":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M5 4h11l3 3v13H5V4Z" />
          <path d="M8 10h8M8 14h8M8 18h5" />
        </svg>
      );
    case "schedule":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <rect x="4" y="5" width="16" height="15" rx="1.5" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case "music":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M9 18V6l10-2v12" />
          <circle cx="7" cy="18" r="2.2" />
          <circle cx="17" cy="16" r="2.2" />
        </svg>
      );
    case "ads":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="6" width="18" height="12" rx="1.5" />
          <path d="M7 10h5M7 14h10" />
        </svg>
      );
    case "pages":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M7 3h8l4 4v14H7V3Z" />
          <path d="M15 3v5h5" />
        </svg>
      );
    case "banners":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="5" width="18" height="14" rx="1.5" />
          <path d="m3 16 5-5 4 4 3-3 6 6" />
        </svg>
      );
    case "dj":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <circle cx="8" cy="14" r="3.2" />
          <circle cx="16" cy="14" r="3.2" />
          <path d="M8 11V7h8v4" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "comments":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M5 5h14v10H8l-3 3V5Z" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2M12 19v2M4.9 6.5l1.5 1.5M17.6 16l1.5 1.5M3 12h2M19 12h2M4.9 17.5l1.5-1.5M17.6 8l1.5-1.5" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <circle cx="9" cy="8" r="3" />
          <path d="M4 19c0-3 2.2-5 5-5s5 2 5 5" />
          <path d="M16 11a3 3 0 1 0 0-4M20 19c0-2.4-1.5-4-3.5-4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M7 4h10v16H7z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
  }
}
