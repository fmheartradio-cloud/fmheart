export type AdminNavItem = {
  href: string;
  label: string;
  icon:
    | "home"
    | "live"
    | "now"
    | "news"
    | "schedule"
    | "music"
    | "ads"
    | "pages"
    | "banners"
    | "dj"
    | "analytics"
    | "comments"
    | "settings"
    | "users"
    | "logs";
  exact?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "home", exact: true },
  { href: "/admin/live", label: "Live Radio", icon: "live" },
  { href: "/admin/now-playing", label: "Now Playing", icon: "now" },
  { href: "/admin/articles", label: "News Management", icon: "news" },
  { href: "/admin/schedule", label: "Programs & Schedule", icon: "schedule" },
  { href: "/admin/music", label: "Music Library", icon: "music" },
  { href: "/admin/ads", label: "Ad Management", icon: "ads" },
  { href: "/admin/pages", label: "Website Pages", icon: "pages" },
  { href: "/admin/banners", label: "Banners & Sliders", icon: "banners" },
  { href: "/admin/djs", label: "DJ Management", icon: "dj" },
  { href: "/admin/analytics", label: "Listeners & Analytics", icon: "analytics" },
  { href: "/admin/comments", label: "Comments", icon: "comments" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
  { href: "/admin/users", label: "Users & Roles", icon: "users" },
  { href: "/admin/logs", label: "Activity Logs", icon: "logs" },
];

export function isAdminNavActive(
  pathname: string,
  href: string,
  exact?: boolean,
) {
  return exact ? pathname === href : pathname.startsWith(href);
}
