"use client";

import { useEffect, useState } from "react";
import { cmsFetch } from "@/lib/cms-fetch";

type Log = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    void cmsFetch<{ logs: Log[] }>("/api/admin/users").then((d) =>
      setLogs(d.logs || []),
    );
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Activity Logs
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Stream actions, announcements, schedule/music/DJ saves.
        </p>
      </div>
      <ul className="divide-y divide-neutral-100 rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        {logs.length === 0 ? (
          <li className="text-sm text-fh-muted">No activity yet.</li>
        ) : (
          logs.map((log) => (
            <li key={log.id} className="py-3">
              <p className="font-bold">{log.action}</p>
              <p className="text-xs text-fh-muted">
                {new Date(log.at).toLocaleString("en-GB")} · {log.actor}
                {log.detail ? ` · ${log.detail}` : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
