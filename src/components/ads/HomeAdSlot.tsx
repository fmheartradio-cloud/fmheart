"use client";

import type { ReactNode } from "react";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { DirectBanner } from "@/components/ads/DirectBanner";
import { adSlot } from "@/lib/ads";
import { isLiveBanner, type DirectAdBanner } from "@/types/ads";

type HomeAdSlotProps = {
  banner?: DirectAdBanner | null;
  adsenseKind?: "header" | "sidebar" | "inArticle" | "player";
  label: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  fallback?: ReactNode;
  objectFit?: "cover" | "contain";
  anchorId?: string;
};

export function HomeAdSlot({
  banner,
  adsenseKind,
  label,
  className = "",
  width,
  height,
  fill = false,
  format = "auto",
  responsive = true,
  fallback,
  objectFit = "contain",
  anchorId,
}: HomeAdSlotProps) {
  const wrap = (node: ReactNode) =>
    anchorId ? <div id={anchorId}>{node}</div> : node;

  if (isLiveBanner(banner)) {
    return wrap(
      <DirectBanner
        imageUrl={banner.imageUrl}
        href={banner.href || "/promotion"}
        alt={banner.alt || label}
        width={width}
        height={height}
        fill={fill}
        className={className}
        objectFit={objectFit}
      />
    );
  }

  const slot = adsenseKind ? adSlot(adsenseKind) : undefined;
  if (slot) {
    return wrap(
      <AdSenseUnit
        slot={slot}
        label={label}
        className={className}
        width={width}
        height={height}
        format={format}
        responsive={responsive}
      />,
    );
  }

  if (fallback) return wrap(fallback);

  return wrap(
    <AdSenseUnit
      label={label}
      className={className}
      width={width}
      height={height}
      format={format}
      responsive={responsive}
    />,
  );
}
