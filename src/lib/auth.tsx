"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, tokenStore, unwrap } from "./api";
import { TokenResponse, UserSummary } from "./types";

interface AuthContextValue {
  user: UserSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("zyntral_user") : null;
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    const data = unwrap<TokenResponse>(res.data);
    tokenStore.set(data.accessToken, data.refreshToken);
    localStorage.setItem("zyntral_user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    const refresh = tokenStore.refresh;
    if (refresh) api.post("/auth/logout", { refreshToken: refresh }).catch(() => {});
    tokenStore.clear();
    localStorage.removeItem("zyntral_user");
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
