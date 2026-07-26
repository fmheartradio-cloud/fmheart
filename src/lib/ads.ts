/** AdSense env helpers — placeholders until real IDs are set in Vercel / .env.local */

export const ADS = {
  client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "",
  slots: {
    header: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER || "",
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || "",
    inArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INARTICLE || "",
  },
} as const;

export function adSlot(
  kind: keyof typeof ADS.slots,
): string | undefined {
  const value = ADS.slots[kind];
  if (!value || value.includes("YOUR_")) return undefined;
  return value;
}
