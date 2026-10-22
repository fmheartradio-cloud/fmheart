"use client";

import { useEffect, useState, type FormEvent } from "react";
import { cmsFetch } from "@/lib/cms-fetch";

export function DjPortalPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [configured, setConfigured] = useState(false);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void cmsFetch<{ configured: boolean; envConfigured: boolean }>(
      "/api/admin/dj-auth",
    )
      .then((d) => {
        setConfigured(d.configured);
        setEnvConfigured(d.envConfigured);
      })
      .catch((err) => setMsg(err instanceof Error ? err.message : "Load failed"));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg("Passwords match වෙන්නේ නැහැ.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await cmsFetch("/api/admin/dj-auth", {
        method: "PUT",
        body: JSON.stringify({ password }),
      });
      setConfigured(true);
      setPassword("");
      setConfirm("");
      setMsg("DJ portal password saved ✓");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSave}
      className="mx-auto max-w-5xl space-y-3 rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
    >
      <h2 className="font-heading text-lg font-extrabold">DJ portal login</h2>
      <p className="text-sm text-fh-muted">
        DJ කෙනෙක් <code>/dj</code> වලට log වෙන්න ඕන නම් DJ Management එකේ
        email එකක් දාන්න. Password එක මෙතනින් set කරන්න — ADMIN password
        එකට වෙනම.
        {envConfigured ? " DJ_PASSWORD env එකත් active." : ""}
        {configured ? " Portal password set වෙලා තියෙනවා." : " Password තවම නැහැ."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          New DJ password
          <input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
          />
        </label>
        <label className="text-sm font-semibold">
          Confirm
          <input
            type="password"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 rounded-full bg-fh-red px-5 font-heading text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save DJ password"}
      </button>
      {msg ? <p className="text-sm text-fh-muted">{msg}</p> : null}
    </form>
  );
}
