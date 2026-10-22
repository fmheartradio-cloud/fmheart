"use client";

import Link from "next/link";
import { HomeAdSlot } from "@/components/ads/HomeAdSlot";
import { HOME_AD_SLOT_PIXELS } from "@/lib/ad-placements";
import type { DirectAdBanner } from "@/types/ads";

/** Medium rectangle — fits the 320px live-radio column (10px side padding). */
export const PLAYER_AD = HOME_AD_SLOT_PIXELS.player;

export function PlayerAd({ banner }: { banner?: DirectAdBanner | null }) {
  return (
    <div className="flex justify-center">
      <HomeAdSlot
        banner={banner}
        adsenseKind="player"
        label={`Player ${PLAYER_AD.width}×${PLAYER_AD.height}`}
        width={PLAYER_AD.width}
        height={PLAYER_AD.height}
        fill={PLAYER_AD.fill}
        format="rectangle"
        responsive={false}
        className="overflow-hidden bg-white"
        anchorId="ad-player"
        fallback={
          <Link
            href="/promotion"
            className="mx-auto flex w-full max-w-[300px] flex-col items-center justify-center border border-dashed border-white/20 bg-white/[0.04] text-center transition hover:border-fh-red/60 hover:bg-white/[0.07]"
            style={{ aspectRatio: `${PLAYER_AD.width} / ${PLAYER_AD.height}` }}
            aria-label={`Advertise ${PLAYER_AD.width} by ${PLAYER_AD.height}`}
          >
            <p className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
              Advertisement
            </p>
            <p className="mt-1 font-heading text-lg font-extrabold text-white/85">
              {PLAYER_AD.width} × {PLAYER_AD.height}
            </p>
            <p className="mt-3 font-heading text-xs font-bold tracking-wide text-fh-red">
              PROMOTE WITH US
            </p>
          </Link>
        }
      />
    </div>
  );
}
