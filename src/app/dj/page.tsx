"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { cmsFetch } from "@/lib/cms-fetch";

type ScheduleItem = {
  id: string;
  title: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  dj?: string;
};

type Payload = {
  email: string;
  live: {
    live?: boolean;
    listeners?: number;
    track?: { song: string; artist: string };
  } | null;
  state: {
    announcement: string;
    onAir?: boolean;
  };
  schedule: ScheduleItem[];
};

export default function DjStudioPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next = await cmsFetch<Payload>("/api/dj/studio");
    setData(next);
    setAnnouncement(next.state.announcement || "");
  }, []);

  useEffect(() => {
    void load().catch((err) =>
      setMsg(err instanceof Error ? err.message : "Load failed"),
    );
  }, [load]);

  async function onAnnounce(e: FormEvent) {
    e.preventDefault();
    try {
      await cmsFetch("/api/dj/studio", {
        method: "POST",
        body: JSON.stringify({ action: "announce", announcement }),
      });
      setMsg("Announcement saved ✓");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          DJ Studio
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Now playing, listeners සහ weekly schedule. Stream start/stop CMS
          admin ට විතරයි.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <p className="text-[11px] font-extrabold tracking-wider text-fh-red">
          NOW PLAYING
        </p>
        <p className="mt-1 font-heading text-2xl font-extrabold">
          {data?.live?.track?.song || "FM Heart Live"}
        </p>
        <p className="text-fh-muted">{data?.live?.track?.artist || "On Air"}</p>
        <p className="mt-2 text-sm">
          {data?.live?.listeners ?? 0} listening
          {data?.live?.live ? " · Icecast live" : ""}
          {data?.state.onAir ? " · CMS ON AIR" : ""}
        </p>
      </section>

      <form
        onSubmit={onAnnounce}
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
          Save announcement
        </button>
        {msg ? <p className="text-sm text-fh-muted">{msg}</p> : null}
      </form>

      <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="font-heading text-lg font-extrabold">Schedule</h2>
        {data?.schedule.length ? (
          <ul className="mt-3 divide-y divide-neutral-100">
            {data.schedule.map((item) => (
              <li key={item.id} className="py-3">
                <p className="font-heading text-sm font-bold">{item.title}</p>
                <p className="text-xs text-fh-muted">
                  {[item.day, item.startTime, item.endTime ? `– ${item.endTime}` : "", item.dj]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-fh-muted">Schedule හිස්යි.</p>
        )}
      </section>
    </div>
  );
}
