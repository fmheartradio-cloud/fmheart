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
import { PRIMARY_ADMIN_EMAIL } from "@/lib/admin";

type AdminUser = { email: string };

type AdminAuthContextValue = {
  configured: boolean;
  user: AdminUser | null;
  busy: boolean;
  message: string | null;
  denied: boolean;
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setMessage: (v: string | null) => void;
  handleLogin: (e: FormEvent) => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState(PRIMARY_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session", { credentials: "include" })
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
      setDenied(false);
      try {
        const res = await fetch("/api/admin/session", {
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
          setDenied(res.status === 403);
          setMessage(data.error || "Login failed");
          return;
        }
        setUser({ email: data.email || email });
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Login failed");
      } finally {
        setBusy(false);
      }
    },
    [email, password],
  );

  const handleGoogleLogin = useCallback(async () => {
    setMessage(
      "Google login දැන් Firebase නැති නිසා වැඩ කරන්නේ නැහැ. Admin email + ADMIN_PASSWORD එකෙන් login වෙන්න.",
    );
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "include",
    });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      configured,
      user,
      busy,
      message,
      denied,
      email,
      password,
      setEmail,
      setPassword,
      setMessage,
      handleLogin,
      handleGoogleLogin,
      logout,
    }),
    [
      configured,
      user,
      busy,
      message,
      denied,
      email,
      password,
      handleLogin,
      handleGoogleLogin,
      logout,
    ],
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
