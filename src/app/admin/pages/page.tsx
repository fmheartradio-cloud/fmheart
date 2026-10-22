"use client";

import Link from "next/link";
import { CmsListPage } from "@/components/admin/CmsListPage";

export default function AdminPagesPage() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["/admin/videos", "Videos"],
          ["/admin/breaking", "Breaking ticker"],
          ["/about", "View About"],
          ["/contact", "View Contact"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl bg-white px-4 py-4 text-sm font-bold shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            {label} →
          </Link>
        ))}
      </div>
      <CmsListPage
        listKey="pages"
        title="Website Pages"
        hint="Extra page copy. Public routes (/about, /contact, /promotion) තවම static — මෙහි drafts save කරන්න."
        fields={[
          { key: "title", label: "Title", required: true },
          { key: "slug", label: "Slug", placeholder: "about", required: true },
          { key: "body", label: "Body", type: "textarea", required: true },
        ]}
      />
    </div>
  );
}
