"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { cmsFetch } from "@/lib/cms-fetch";

type Payload = {
  live: {
    track: { song: string; artist: string };
    listeners: number;
  } | null;
  state: {
    announcement: string;
    trackHistory: {
      song: string;
      artist: string;
      plays: number;
      lastPlayed: string;
    }[];
  };
};

export default function AdminNowPlayingPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next = await cmsFetch<Payload>("/api/admin/radio");
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
      await cmsFetch("/api/admin/radio", {
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
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Now Playing
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Icecast current title + play history. Announcement CMS එකේ save වෙනවා.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <p className="text-[11px] font-extrabold tracking-wider text-fh-red">
          NOW PLAYING
        </p>
        <p className="mt-1 font-heading text-2xl font-extrabold">
          {data?.live?.track.song || "FM Heart Live"}
        </p>
        <p className="text-fh-muted">{data?.live?.track.artist || "On Air"}</p>
        <p className="mt-2 text-sm">
          {data?.live?.listeners ?? 0} listening
        </p>
      </section>

      <form
        onSubmit={onAnnounce}
        className="space-y-3 rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
      >
        <h2 className="font-heading text-lg font-bold">Send announcement</h2>
        <textarea
          rows={3}
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          placeholder="On-air message / promo line"
          className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-fh-red px-5 font-heading text-sm font-bold text-white"
        >
          Save announcement
        </button>
      </form>

      <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="font-heading text-lg font-bold">Top tracks</h2>
        <ol className="mt-3 space-y-3">
          {(data?.state.trackHistory || []).map((t, i) => (
            <li key={`${t.song}-${i}`} className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">
                  {i + 1}. {t.song}
                </p>
                <p className="truncate text-xs text-fh-muted">{t.artist}</p>
              </div>
              <span className="font-bold text-emerald-500">{t.plays}</span>
            </li>
          ))}
        </ol>
        {msg ? <p className="mt-3 text-sm text-fh-muted">{msg}</p> : null}
      </section>
    </div>
  );
}
