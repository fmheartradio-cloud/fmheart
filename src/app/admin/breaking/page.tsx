"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getBreakingHeadlines,
  saveBreakingHeadlines,
} from "@/services/breaking";
import { breakingHeadlines as mockHeadlines } from "@/data/mock";

export default function AdminBreakingPage() {
  const [breakingText, setBreakingText] = useState(mockHeadlines.join("\n"));
  const [breakingMsg, setBreakingMsg] = useState<string | null>(null);
  const [breakingBusy, setBreakingBusy] = useState(false);

  useEffect(() => {
    void getBreakingHeadlines().then((items) =>
      setBreakingText(items.join("\n")),
    );
  }, []);

  async function handleSaveBreaking(e: FormEvent) {
    e.preventDefault();
    setBreakingBusy(true);
    setBreakingMsg(null);
    try {
      const lines = breakingText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const saved = await saveBreakingHeadlines(lines);
      setBreakingText(saved.join("\n"));
      setBreakingMsg("Breaking news updated ✓");
    } catch (err) {
      setBreakingMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBreakingBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Breaking News
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Top ticker headlines — එක පේළියකට එකක්.
        </p>
      </div>

      <form
        onSubmit={handleSaveBreaking}
        className="space-y-3 border border-neutral-200 bg-white p-5"
      >
        <textarea
          required
          rows={8}
          value={breakingText}
          onChange={(e) => setBreakingText(e.target.value)}
          placeholder={"Headline 1\nHeadline 2\nHeadline 3"}
          className="w-full border border-neutral-300 px-3 py-2 font-sans text-sm"
        />
        <button
          type="submit"
          disabled={breakingBusy}
          className="bg-fh-red px-5 py-2.5 font-heading text-sm font-bold text-white disabled:opacity-60"
        >
          {breakingBusy ? "Saving…" : "Save Breaking News"}
        </button>
        {breakingMsg && <p className="text-sm text-fh-muted">{breakingMsg}</p>}
      </form>
    </div>
  );
}
