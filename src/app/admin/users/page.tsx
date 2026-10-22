"use client";

import { useEffect, useState } from "react";
import { cmsFetch } from "@/lib/cms-fetch";

export default function AdminUsersPage() {
  const [data, setData] = useState<{
    emails: string[];
    primary: string;
    you: string;
  } | null>(null);

  useEffect(() => {
    void cmsFetch<{ emails: string[]; primary: string; you: string }>(
      "/api/admin/users",
    ).then(setData);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Users & Roles
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          CMS login allowlist. New admins:{" "}
          <code>NEXT_PUBLIC_ADMIN_EMAILS</code> + shared <code>ADMIN_PASSWORD</code>.
        </p>
      </div>
      <ul className="divide-y divide-neutral-100 rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        {(data?.emails || []).map((email) => (
          <li key={email} className="flex items-center justify-between py-3">
            <div>
              <p className="font-bold">{email}</p>
              <p className="text-xs text-fh-muted">
                {email === data?.primary ? "Primary admin" : "Admin"}
                {email === data?.you ? " · you" : ""}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              Admin
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
