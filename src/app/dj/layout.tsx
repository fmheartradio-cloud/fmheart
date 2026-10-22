"use client";

import type { ReactNode } from "react";
import { DjAuthGate } from "@/components/dj/DjAuthGate";
import { DjAuthProvider } from "@/context/DjAuthProvider";

export default function DjLayout({ children }: { children: ReactNode }) {
  return (
    <DjAuthProvider>
      <DjAuthGate>{children}</DjAuthGate>
    </DjAuthProvider>
  );
}
