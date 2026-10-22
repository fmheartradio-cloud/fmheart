"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type DjUser = { email: string };

type DjAuthContextValue = {
  configured: boolean;
  user: DjUser | null;
  busy: boolean;
  message: string | null;
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  handleLogin: (e: FormEvent) => Promise<void>;
  logout: () => Promise<void>;
};

const DjAuthContext = createContext<DjAuthContextValue | null>(null);

export function DjAuthProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(true);
  const [user, setUser] = useState<DjUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/dj/session", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { configured?: boolean; email?: string | null }) => {
        if (cancelled) return;
        setConfigured(Boolean(data.configured));
        if (data.email) setUser({ email: data.email });
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setMessage(null);
      try {
        const res = await fetch("/api/dj/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          email?: string;
          error?: string;
        };
        if (!res.ok) {
          setMessage(data.error || "Login failed");
          return;
        }
        setUser({ email: data.email || email });
        setPassword("");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Login failed");
      } finally {
        setBusy(false);
      }
    },
    [email, password],
  );

  const logout = useCallback(async () => {
    await fetch("/api/dj/session", { method: "DELETE", credentials: "include" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      configured,
      user,
      busy,
      message,
      email,
      password,
      setEmail,
      setPassword,
      handleLogin,
      logout,
    }),
    [configured, user, busy, message, email, password, handleLogin, logout],
  );

  return <DjAuthContext.Provider value={value}>{children}</DjAuthContext.Provider>;
}

export function useDjAuth() {
  const ctx = useContext(DjAuthContext);
  if (!ctx) throw new Error("useDjAuth must be used inside DjAuthProvider");
  return ctx;
}
