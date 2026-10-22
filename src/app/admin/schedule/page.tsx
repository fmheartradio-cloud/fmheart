"use client";

import { CmsListPage } from "@/components/admin/CmsListPage";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AdminSchedulePage() {
  return (
    <CmsListPage
      listKey="schedule"
      title="Programs & Schedule"
      hint="Weekly show grid එක. Homepage clock එකට later wire කරන්න පුළුවන්."
      fields={[
        { key: "title", label: "Show name", required: true },
        { key: "day", label: "Day", type: "select", options: DAYS, required: true },
        { key: "startTime", label: "Start", type: "time", required: true },
        { key: "endTime", label: "End", type: "time", required: true },
        { key: "dj", label: "DJ / presenter" },
        { key: "note", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
