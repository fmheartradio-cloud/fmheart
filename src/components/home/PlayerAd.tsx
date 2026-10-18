"use client";

import Link from "next/link";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { adSlot } from "@/lib/ads";

/** Fixed 300×250 — fits the 320px live-radio column. */
export const PLAYER_AD = { width: 300, height: 250 } as const;

export function PlayerAd() {
  const slot = adSlot("player");

  if (slot) {
    return (
      <div className="flex justify-center">
        <AdSenseUnit
          slot={slot}
          format="rectangle"
          label="Player 300×250"
          width={PLAYER_AD.width}
          height={PLAYER_AD.height}
          responsive={false}
          className="min-h-0 overflow-hidden bg-white"
        />
      </div>
    );
  }

  return (
    <Link
      href="/promotion"
      className="mx-auto flex h-[250px] w-[300px] max-w-full flex-col items-center justify-center border border-dashed border-white/20 bg-white/[0.04] text-center transition hover:border-fh-red/60 hover:bg-white/[0.07]"
      aria-label="Advertise 300 by 250"
    >
      <p className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
        Advertisement
      </p>
      <p className="mt-1 font-heading text-lg font-extrabold text-white/85">
        300 × 250
      </p>
      <p className="mt-3 font-heading text-xs font-bold tracking-wide text-fh-red">
        PROMOTE WITH US
      </p>
    </Link>
  );
}
