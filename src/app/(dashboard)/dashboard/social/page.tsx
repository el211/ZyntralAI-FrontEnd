"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SocialAccount {
  id: string;
  platform: string;
  displayName: string | null;
  handle: string | null;
  status: string;
}

// All platforms have a real OAuth flow wired on the backend (each activates once its
// client credentials are configured in the environment).
const PLATFORMS = ["LINKEDIN", "TWITTER", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "PINTEREST"];
const OAUTH_ENABLED = new Set(PLATFORMS);

export default function SocialPage() {
  const { current } = useWorkspace();
  const qc = useQueryClient();
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ["social", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<SocialAccount[]>((await api.get(`/workspaces/${current!.id}/social-accounts`)).data),
  });

  // surface the result of the OAuth round-trip (?connected= / ?error=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) {
      setBanner({ kind: "ok", text: `${connected} account connected.` });
      qc.invalidateQueries({ queryKey: ["social", current?.id] });
    } else if (error) {
      setBanner({ kind: "err", text: `Connection failed: ${error}` });
    }
    if (connected || error) {
      window.history.replaceState({}, "", "/dashboard/social");
    }
  }, [current?.id, qc]);

  async function connect(platform: string) {
    if (!current) return;
    setConnecting(platform);
    try {
      const res = await api.get(
        `/workspaces/${current.id}/social-accounts/connect/${platform.toLowerCase()}`,
      );
      const { authorizationUrl } = unwrap<{ authorizationUrl: string }>(res.data);
      window.location.href = authorizationUrl; // redirect to provider consent screen
    } catch (err) {
      setBanner({ kind: "err", text: apiErrorMessage(err) });
      setConnecting(null);
    }
  }

  async function disconnect(id: string) {
    if (!current) return;
    await api.delete(`/workspaces/${current.id}/social-accounts/${id}`);
    qc.invalidateQueries({ queryKey: ["social", current.id] });
  }

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Social accounts</h1>

      {banner && (
        <div className={`rounded-md border p-3 text-sm ${
          banner.kind === "ok" ? "border-green-500/40 text-green-500" : "border-destructive/40 text-destructive"
        }`}>
          {banner.text}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Connected</h2>
        {accounts.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No accounts connected yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <Card key={a.id}><CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{a.displayName || a.platform}</div>
                  <div className="text-sm text-muted-foreground">{a.handle ?? a.platform}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-green-500">{a.status}</span>
                  <Button size="sm" variant="ghost" onClick={() => disconnect(a.id)}>Disconnect</Button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Available to connect</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PLATFORMS.map((p) => {
            const enabled = OAUTH_ENABLED.has(p);
            return (
              <Card key={p}><CardContent className="flex items-center justify-between p-4">
                <span className="text-sm font-medium capitalize">{p.toLowerCase()}</span>
                <Button size="sm" variant="outline" disabled={!enabled || connecting === p}
                  onClick={() => connect(p)}>
                  {!enabled ? "Soon" : connecting === p ? "Redirecting…" : "Connect"}
                </Button>
              </CardContent></Card>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          LinkedIn uses a real OAuth 2.0 flow (set <code>LINKEDIN_CLIENT_ID</code> /
          <code>LINKEDIN_CLIENT_SECRET</code>). Other networks share the same port and activate
          as their OAuth adapters are added.
        </p>
      </div>
    </div>
  );
}
