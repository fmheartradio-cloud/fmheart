"use client";

import { RadioProvider } from "@/context/RadioProvider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <RadioProvider>{children}</RadioProvider>;
}
