/** CMS / Firestore admin allowlist */
const DEFAULT_ADMINS = ["fmheartradio@gmail.com"];

export function getAdminEmails(): string[] {
  const fromEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ADMINS, ...fromEnv])];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export const PRIMARY_ADMIN_EMAIL = "fmheartradio@gmail.com";
