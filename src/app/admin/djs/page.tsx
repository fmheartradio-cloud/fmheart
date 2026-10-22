"use client";

import { CmsListPage } from "@/components/admin/CmsListPage";
import { DjPortalPassword } from "@/components/admin/DjPortalPassword";

export default function AdminDjsPage() {
  return (
    <div className="space-y-5">
      <CmsListPage
        listKey="djs"
        title="DJ Management"
        hint="Presenters, RJs සහ show hosts. DJ login එකට email එක අනිවාර්යයි."
        fields={[
          { key: "title", label: "Name", required: true },
          { key: "email", label: "DJ login email", placeholder: "rj@fmheart.lk" },
          { key: "role", label: "Role", placeholder: "Breakfast RJ" },
          { key: "photo", label: "Photo URL", type: "url" },
          { key: "bio", label: "Bio", type: "textarea" },
        ]}
      />
      <DjPortalPassword />
    </div>
  );
}
