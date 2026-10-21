"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSession, signOut } from "../lib/auth-api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getSession({ signal: controller.signal })
      .then((session) => setUser(session.user))
      .catch(() => setUser(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const adminRoute = pathname === "/users" || pathname === "/products/new" || pathname.endsWith("/edit");
    if (user.role !== "Admin" && adminRoute) router.replace("/products");
  }, [loading, pathname, router, user]);

  async function logout() {
    try {
      await signOut();
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }

  if (loading || !user) {
    return <main className="auth-loading" aria-busy="true"><span className="inline-loader" />Checking your session…</main>;
  }

  const adminRoute = pathname === "/users" || pathname === "/products/new" || pathname.endsWith("/edit");
  if (user.role !== "Admin" && adminRoute) {
    return <main className="auth-loading" aria-busy="true"><span className="inline-loader" />Redirecting…</main>;
  }

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}