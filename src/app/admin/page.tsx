"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_URL, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ADMIN_KEY = "zyntral_admin_token";

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
}
interface Overview {
  totalUsers: number; totalWorkspaces: number; liveSubscriptions: number;
  totalRevenueCents: number; totalAiGenerations: number; totalSocialAccounts: number;
}

function adminApi(token: string) {
  const c = axios.create({ baseURL: API_URL });
  c.interceptors.request.use((cfg) => { cfg.headers.Authorization = `Bearer ${token}`; return cfg; });
  return c;
}

export default function AdminPanel() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { setToken(localStorage.getItem(ADMIN_KEY)); }, []);

  if (token === null) return <LoginGate onToken={(t) => { localStorage.setItem(ADMIN_KEY, t); setToken(t); }} />;
  return <Dashboard token={token} onLogout={() => { localStorage.removeItem(ADMIN_KEY); setToken(null); }} />;
}

function LoginGate({ onToken }: { onToken: (t: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await axios.post(`${API_URL}/admin/login`, { username, password });
      onToken(res.data.data.accessToken);
    } catch (err) { setError(apiErrorMessage(err)); } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Admin panel</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></div>
            <div className="space-y-2"><Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !username || !password}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const api = adminApi(token);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, u] = await Promise.all([api.get("/admin/overview"), api.get("/admin/users?size=200")]);
      setOverview(o.data.data);
      setUsers(u.data.data.items);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) onLogout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<unknown>, okMsg: string) {
    setMsg(null);
    try { await fn(); setMsg(okMsg); await load(); }
    catch (err) { setMsg(apiErrorMessage(err)); }
  }

  function impersonate(u: AdminUser) {
    api.post(`/admin/users/${u.id}/impersonate`).then((res) => {
      const { accessToken, user } = res.data.data;
      localStorage.setItem("zyntral_access", accessToken);
      localStorage.removeItem("zyntral_refresh");
      localStorage.setItem("zyntral_user", JSON.stringify(user));
      window.location.href = "/dashboard";
    }).catch((err) => setMsg(apiErrorMessage(err)));
  }

  const metrics = overview ? [
    ["Users", overview.totalUsers], ["Workspaces", overview.totalWorkspaces],
    ["Live subs", overview.liveSubscriptions], ["Revenue", `$${(overview.totalRevenueCents / 100).toFixed(2)}`],
    ["AI gens", overview.totalAiGenerations], ["Social", overview.totalSocialAccounts],
  ] as const : [];

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin panel</h1>
        <Button variant="outline" size="sm" onClick={onLogout}>Sign out</Button>
      </div>

      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map(([label, value]) => (
          <Card key={label}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xl font-bold">{value}</div>
          </CardContent></Card>
        ))}
      </div>

      {msg && <p className="mb-4 text-sm text-muted-foreground">{msg}</p>}

      <Card>
        <CardHeader><CardTitle>Users ({users.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => <UserRow key={u.id} u={u} api={api} act={act} impersonate={impersonate} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({ u, api, act, impersonate }: {
  u: AdminUser;
  api: ReturnType<typeof adminApi>;
  act: (fn: () => Promise<unknown>, okMsg: string) => void;
  impersonate: (u: AdminUser) => void;
}) {
  const [plan, setPlan] = useState("PRO");
  const [credits, setCredits] = useState("500");
  const suspended = u.status === "SUSPENDED" || u.status === "DELETED";

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{u.email} {u.roles.includes("ADMIN") && <span className="text-xs text-primary">· ADMIN</span>}</div>
          <div className="text-xs text-muted-foreground">{u.fullName || "—"} · {u.status}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {suspended ? (
            <Button size="sm" variant="outline"
              onClick={() => act(() => api.post(`/admin/users/${u.id}/activate`), "Reactivated")}>Activate</Button>
          ) : (
            <Button size="sm" variant="outline"
              onClick={() => act(() => api.post(`/admin/users/${u.id}/suspend`), "Suspended")}>Suspend</Button>
          )}
          <Button size="sm" onClick={() => impersonate(u)}>Login as</Button>
          <Button size="sm" variant="destructive"
            onClick={() => { if (confirm(`Delete ${u.email}?`)) act(() => api.delete(`/admin/users/${u.id}`), "Deleted"); }}>
            Delete
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Select className="h-9 w-28" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="FREE">Free</option><option value="PRO">Pro</option><option value="BUSINESS">Business</option>
        </Select>
        <Button size="sm" variant="secondary"
          onClick={() => act(() => api.post(`/admin/users/${u.id}/plan`, { plan }), `Set ${plan}`)}>Set plan</Button>
        <Input className="h-9 w-24" type="number" value={credits} onChange={(e) => setCredits(e.target.value)} />
        <Button size="sm" variant="secondary"
          onClick={() => act(() => api.post(`/admin/users/${u.id}/credits`, { amount: Number(credits) }), "Credits added")}>
          Add credits
        </Button>
      </div>
    </div>
  );
}
