"use client";

import { useEffect, useState, type FormEvent } from "react";
import { cmsFetch } from "@/lib/cms-fetch";
import { SITE } from "@/lib/site";

export default function AdminSettingsPage() {
  const [announcement, setAnnouncement] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void cmsFetch<{ state: { announcement: string } }>("/api/admin/radio").then(
      (d) => setAnnouncement(d.state.announcement || ""),
    );
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    try {
      await cmsFetch("/api/admin/radio", {
        method: "POST",
        body: JSON.stringify({ action: "announce", announcement }),
      });
      setMsg("Settings saved ✓");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-fh-muted">
          Station identity mostly lives in code / env. Announcement CMS එකේ save වෙනවා.
        </p>
      </div>
      <section className="space-y-3 rounded-2xl bg-white p-5 text-sm shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <p>
          <span className="text-fh-muted">Station</span> · {SITE.name}
        </p>
        <p className="break-all">
          <span className="text-fh-muted">Stream</span> · {SITE.streamUrl}
        </p>
        <p>
          <span className="text-fh-muted">WhatsApp</span> · {SITE.whatsapp}
        </p>
        <p>
          <span className="text-fh-muted">Email</span> · {SITE.email}
        </p>
      </section>
      <form
        onSubmit={onSave}
        className="space-y-3 rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
      >
        <label className="block text-sm font-semibold">
          On-air announcement
          <textarea
            rows={3}
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-full bg-fh-red px-5 font-heading text-sm font-bold text-white"
        >
          Save
        </button>
        {msg ? <p className="text-sm text-fh-muted">{msg}</p> : null}
      </form>
    </div>
  );
}
