import { sriLankaNowParts } from "@/lib/datetime";
import { getAdminDb } from "@/lib/db/compat";
import { fetchIcecastLive, type IcecastLive } from "@/lib/icecast";
import { parseStreamTitle } from "@/lib/radio/icy";

const STATION_DOC = "station";
const SNAPSHOT_MS = 2 * 60 * 1000;
const MAX_POINTS = 96;
const MAX_TRACKS = 40;
const MAX_LOGS = 80;

export type TopTrack = {
  key: string;
  song: string;
  artist: string;
  plays: number;
  lastPlayed: string;
};

export type ListenerPoint = {
  t: string;
  n: number;
};

export type ActivityLog = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
};

export type StationState = {
  onAir: boolean;
  announcement: string;
  currentKey: string;
  titleStartedAt: string | null;
  trackHistory: TopTrack[];
  listenerPoints: ListenerPoint[];
  lastSnapshotAt: string | null;
  daily: {
    date: string;
    peak: number;
    lastListeners: number;
  };
  logs: ActivityLog[];
  updatedAt: string;
};

function emptyStation(): StationState {
  const { dayKey } = sriLankaNowParts();
  return {
    onAir: true,
    announcement: "",
    currentKey: "",
    titleStartedAt: null,
    trackHistory: [],
    listenerPoints: [],
    lastSnapshotAt: null,
    daily: { date: dayKey, peak: 0, lastListeners: 0 },
    logs: [],
    updatedAt: new Date().toISOString(),
  };
}

function asTrack(raw: unknown): TopTrack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const song = typeof o.song === "string" ? o.song : "";
  const artist = typeof o.artist === "string" ? o.artist : "";
  if (!song) return null;
  return {
    key: typeof o.key === "string" ? o.key : `${artist}::${song}`.toLowerCase(),
    song,
    artist,
    plays: Number(o.plays) || 0,
    lastPlayed: typeof o.lastPlayed === "string" ? o.lastPlayed : new Date().toISOString(),
  };
}

function asPoint(raw: unknown): ListenerPoint | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.t !== "string") return null;
  return { t: o.t, n: Number(o.n) || 0 };
}

function asLog(raw: unknown): ActivityLog | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    id: typeof o.id === "string" ? o.id : `log-${Date.now()}`,
    at: typeof o.at === "string" ? o.at : new Date().toISOString(),
    actor: typeof o.actor === "string" ? o.actor : "system",
    action: typeof o.action === "string" ? o.action : "",
    detail: typeof o.detail === "string" ? o.detail : "",
  };
}

export function normalizeStation(raw: unknown): StationState {
  const base = emptyStation();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  base.onAir = o.onAir !== false;
  base.announcement = typeof o.announcement === "string" ? o.announcement : "";
  base.currentKey = typeof o.currentKey === "string" ? o.currentKey : "";
  base.titleStartedAt =
    typeof o.titleStartedAt === "string" ? o.titleStartedAt : null;
  base.lastSnapshotAt =
    typeof o.lastSnapshotAt === "string" ? o.lastSnapshotAt : null;
  base.trackHistory = Array.isArray(o.trackHistory)
    ? o.trackHistory.map(asTrack).filter((t): t is TopTrack => Boolean(t))
    : [];
  base.listenerPoints = Array.isArray(o.listenerPoints)
    ? o.listenerPoints.map(asPoint).filter((p): p is ListenerPoint => Boolean(p))
    : [];
  if (o.daily && typeof o.daily === "object") {
    const d = o.daily as Record<string, unknown>;
    base.daily = {
      date: typeof d.date === "string" ? d.date : base.daily.date,
      peak: Number(d.peak) || 0,
      lastListeners: Number(d.lastListeners) || 0,
    };
  }
  base.logs = Array.isArray(o.logs)
    ? o.logs.map(asLog).filter((l): l is ActivityLog => Boolean(l))
    : [];
  return base;
}

async function readStation(): Promise<StationState> {
  const db = getAdminDb();
  if (!db) return emptyStation();
  const snap = await db.collection("settings").doc(STATION_DOC).get();
  if (!snap.exists) return emptyStation();
  return normalizeStation(snap.data());
}

async function writeStation(next: StationState): Promise<StationState> {
  const db = getAdminDb();
  if (!db) return next;
  next.updatedAt = new Date().toISOString();
  await db.collection("settings").doc(STATION_DOC).set({ ...next });
  return next;
}

function trackKey(artist: string, song: string) {
  return `${artist}::${song}`.trim().toLowerCase();
}

function recordTitle(state: StationState, artist: string, song: string) {
  const key = trackKey(artist, song);
  if (!key || song === "FM Heart Live") return;
  const now = new Date().toISOString();
  if (state.currentKey !== key) {
    state.currentKey = key;
    state.titleStartedAt = now;
    const existing = state.trackHistory.find((t) => t.key === key);
    if (existing) {
      existing.plays += 1;
      existing.lastPlayed = now;
      existing.song = song;
      existing.artist = artist;
    } else {
      state.trackHistory.push({
        key,
        song,
        artist,
        plays: 1,
        lastPlayed: now,
      });
    }
    state.trackHistory.sort((a, b) => b.plays - a.plays || b.lastPlayed.localeCompare(a.lastPlayed));
    state.trackHistory = state.trackHistory.slice(0, MAX_TRACKS);
  }
}

function recordListeners(state: StationState, listeners: number, peak: number) {
  const now = Date.now();
  const { dayKey } = sriLankaNowParts();
  if (state.daily.date !== dayKey) {
    state.daily = { date: dayKey, peak: listeners, lastListeners: listeners };
  } else {
    state.daily.peak = Math.max(state.daily.peak, listeners, peak);
    state.daily.lastListeners = listeners;
  }

  const lastAt = state.lastSnapshotAt ? Date.parse(state.lastSnapshotAt) : 0;
  if (lastAt && now - lastAt < SNAPSHOT_MS) return;
  state.lastSnapshotAt = new Date(now).toISOString();
  const cutoff = now - 24 * 60 * 60 * 1000;
  state.listenerPoints.push({ t: state.lastSnapshotAt, n: listeners });
  state.listenerPoints = state.listenerPoints
    .filter((p) => Date.parse(p.t) >= cutoff)
    .slice(-MAX_POINTS);
}

export async function syncStationFromIcecast(
  live: IcecastLive | null,
): Promise<StationState> {
  const state = await readStation();
  const before = JSON.stringify(state);
  if (live) {
    recordTitle(state, live.track.artist, live.track.song);
    recordListeners(state, live.listeners, live.peak);
    if (live.live) state.onAir = true;
  }
  if (JSON.stringify(state) === before) return state;
  return writeStation(state);
}

export async function setStationOnAir(
  onAir: boolean,
  actor: string,
): Promise<StationState> {
  const state = await readStation();
  state.onAir = onAir;
  const log: ActivityLog = {
    id: `log-${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    actor,
    action: onAir ? "Start Stream" : "Stop Stream",
    detail: onAir ? "CMS marked ON AIR" : "CMS marked OFF AIR",
  };
  state.logs = [log, ...state.logs].slice(0, MAX_LOGS);
  return writeStation(state);
}

export async function saveAnnouncement(
  announcement: string,
  actor: string,
): Promise<StationState> {
  const state = await readStation();
  state.announcement = announcement.trim();
  state.logs = [
    {
      id: `log-${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      actor,
      action: "Announcement",
      detail: state.announcement.slice(0, 140) || "(cleared)",
    },
    ...state.logs,
  ].slice(0, MAX_LOGS);
  return writeStation(state);
}

export async function appendActivityLog(entry: {
  actor: string;
  action: string;
  detail?: string;
}) {
  const state = await readStation();
  state.logs = [
    {
      id: `log-${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      actor: entry.actor,
      action: entry.action,
      detail: entry.detail || "",
    },
    ...state.logs,
  ].slice(0, MAX_LOGS);
  await writeStation(state);
}

export async function getStationState(): Promise<StationState> {
  return readStation();
}

export async function getLiveStation() {
  const live = await fetchIcecastLive();
  const state = await syncStationFromIcecast(live);
  return { live, state };
}

export function displayTrack(live: IcecastLive | null) {
  if (live?.track.song) return live.track;
  return parseStreamTitle("FM Heart Live");
}
