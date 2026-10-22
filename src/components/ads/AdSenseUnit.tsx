"use client";

import { useEffect, useRef } from "react";

type AdSenseUnitProps = {
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
  label?: string;
  width?: number;
  height?: number;
  responsive?: boolean;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSenseUnit({
  slot,
  format = "auto",
  className = "",
  label = "Advertisement",
  width,
  height,
  responsive = true,
}: AdSenseUnitProps) {
  const pushed = useRef(false);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const ready =
    Boolean(client && slot && !client.includes("YOUR_") && !slot.includes("YOUR_"));

  useEffect(() => {
    if (!ready || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense may be blocked
    }
  }, [ready]);

  const boxStyle =
    width && height
      ? {
          display: "block" as const,
          width: "100%",
          maxWidth: `${width}px`,
          height: "auto",
          aspectRatio: `${width} / ${height}`,
        }
      : { display: "block" as const, width: "100%", maxWidth: "100%" };

  if (!ready) {
    return (
      <div
        className={`mx-auto flex w-full items-center justify-center overflow-hidden border border-dashed border-neutral-300 bg-neutral-100 text-center ${className}`}
        aria-label={label}
        style={{
          display: "flex",
          width: "100%",
          maxWidth: width ? `${width}px` : "100%",
          height: "auto",
          aspectRatio: width && height ? `${width} / ${height}` : undefined,
          minHeight: width && height ? undefined : 90,
          boxSizing: "border-box",
        }}
      >
        <div className="px-2 py-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-fh-muted">
            Google AdSense
          </p>
          <p className="mt-1 font-heading text-sm font-semibold text-neutral-500">
            {label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle mx-auto block w-full overflow-hidden ${className}`}
      style={boxStyle}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}
