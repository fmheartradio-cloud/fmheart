"use client";

import { CmsListPage } from "@/components/admin/CmsListPage";

export default function AdminCommentsPage() {
  return (
    <CmsListPage
      listKey="comments"
      title="Comments"
      hint="Moderation queue. Public article comments later මෙහි එනවා."
      fields={[
        { key: "title", label: "Article / topic", required: true },
        { key: "author", label: "Author", required: true },
        { key: "body", label: "Comment", type: "textarea", required: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["pending", "approved", "spam"],
          required: true,
        },
      ]}
    />
  );
}
