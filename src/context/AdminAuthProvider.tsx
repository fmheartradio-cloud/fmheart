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
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { isAdminEmail, PRIMARY_ADMIN_EMAIL } from "@/lib/admin";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

type AdminAuthContextValue = {
  configured: boolean;
  user: User | null;
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
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState(PRIMARY_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, async (next) => {
      if (next && !isAdminEmail(next.email)) {
        setDenied(true);
        setUser(null);
        await signOut(auth);
        return;
      }
      setDenied(false);
      setUser(next);
    });
  }, [configured]);

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const auth = getFirebaseAuth();
      if (!auth) return;
      if (!isAdminEmail(email)) {
        setMessage(
          `Access තියෙන්නේ admin emails වලට විතරයි (${PRIMARY_ADMIN_EMAIL})`,
        );
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Login failed");
      } finally {
        setBusy(false);
      }
    },
    [email, password],
  );

  const handleGoogleLogin = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    setBusy(true);
    setMessage(null);
    setDenied(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
        login_hint: PRIMARY_ADMIN_EMAIL,
      });
      const result = await signInWithPopup(auth, provider);
      if (!isAdminEmail(result.user.email)) {
        await signOut(auth);
        setDenied(true);
        setMessage(
          `${result.user.email} ට access නැහැ. ${PRIMARY_ADMIN_EMAIL} එකෙන් login වෙන්න.`,
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
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
