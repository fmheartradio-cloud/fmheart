"use client";

import { useCallback, useEffect, useState } from "react";
import { cmsFetch } from "@/lib/cms-fetch";
import { SITE } from "@/lib/site";

type RadioPayload = {
  live: {
    live: boolean;
    listeners: number;
    peak: number;
    bitrate: number;
    track: { song: string; artist: string; raw: string };
    streamStart: string | null;
  } | null;
  state: { onAir: boolean; announcement: string };
  notice?: string;
};

export default function AdminLivePage() {
  const [data, setData] = useState<RadioPayload | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const next = await cmsFetch<RadioPayload>("/api/admin/radio");
    setData(next);
  }, []);

  useEffect(() => {
    void load().catch((err) =>
      setMsg(err instanceof Error ? err.message : "Load failed"),
    );
    const t = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(t);
  }, [load]);

  async function act(action: "start" | "stop" | "refresh") {
    setBusy(true);
    try {
      const res = await cmsFetch<RadioPayload>("/api/admin/radio", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setData(res);
      setMsg(res.notice || "Updated ✓");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const live = data?.live;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Live Radio
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Icecast encoder status. Start/Stop CMS ON AIR flag එක update කරනවා —
          Centova panel එකෙන් physical encoder control වෙනවා.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <p className="font-heading text-lg font-bold">
            {live?.track.song || "FM Heart Live"}
          </p>
          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
              live?.live ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200"
            }`}
          >
            {live?.live ? "ON AIR" : "OFF AIR"}
          </span>
        </div>
        <p className="text-sm text-fh-muted">{live?.track.artist || "—"}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-fh-muted">Listeners</dt>
            <dd className="font-heading text-xl font-extrabold">
              {live?.listeners ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fh-muted">Peak</dt>
            <dd className="font-heading text-xl font-extrabold">
              {live?.peak ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fh-muted">Bitrate</dt>
            <dd className="font-bold">{live?.bitrate ? `${live.bitrate} kbps` : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-fh-muted">Stream URL</dt>
            <dd className="truncate text-xs">{SITE.streamUrl}</dd>
          </div>
        </dl>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("start")}
            className="min-h-11 rounded-full bg-fh-red text-xs font-extrabold text-white"
          >
            Start Stream
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("stop")}
            className="min-h-11 rounded-full border border-fh-red text-xs font-extrabold text-fh-red"
          >
            Stop Stream
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("refresh")}
            className="min-h-11 rounded-full border text-xs font-extrabold"
          >
            Refresh Info
          </button>
        </div>
        {msg ? <p className="mt-3 text-sm text-fh-muted">{msg}</p> : null}
      </section>
    </div>
  );
}
