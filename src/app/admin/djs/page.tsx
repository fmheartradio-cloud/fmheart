"use client";

import { CmsListPage } from "@/components/admin/CmsListPage";

export default function AdminDjsPage() {
  return (
    <CmsListPage
      listKey="djs"
      title="DJ Management"
      hint="Presenters, RJs සහ show hosts."
      fields={[
        { key: "title", label: "Name", required: true },
        { key: "role", label: "Role", placeholder: "Breakfast RJ" },
        { key: "photo", label: "Photo URL", type: "url" },
        { key: "bio", label: "Bio", type: "textarea" },
      ]}
    />
  );
}
