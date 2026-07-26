"use client";

import { RadioProvider } from "@/context/RadioProvider";
import { UiProvider } from "@/context/UiProvider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UiProvider>
      <RadioProvider>{children}</RadioProvider>
    </UiProvider>
  );
}
