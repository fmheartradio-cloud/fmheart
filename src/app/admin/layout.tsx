"use client";

import type { ReactNode } from "react";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminAuthProvider } from "@/context/AdminAuthProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminAuthGate>{children}</AdminAuthGate>
    </AdminAuthProvider>
  );
}
