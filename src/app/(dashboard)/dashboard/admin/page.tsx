"use client";

import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { formatCents } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Overview {
  totalUsers: number;
  totalWorkspaces: number;
  liveSubscriptions: number;
  totalRevenueCents: number;
  totalAiGenerations: number;
  totalSocialAccounts: number;
}

export default function AdminPage() {
  const { data: overview } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => unwrap<Overview>((await api.get("/admin/overview")).data),
  });
  const { data: aiUsage } = useQuery({
    queryKey: ["admin-ai"],
    queryFn: async () => unwrap<Record<string, number>>((await api.get("/admin/analytics/ai")).data),
  });
  const { data: social } = useQuery({
    queryKey: ["admin-social"],
    queryFn: async () => unwrap<Record<string, number>>((await api.get("/admin/analytics/social")).data),
  });

  const metrics = [
    { label: "Users", value: overview?.totalUsers },
    { label: "Workspaces", value: overview?.totalWorkspaces },
    { label: "Live subscriptions", value: overview?.liveSubscriptions },
    { label: "Revenue", value: overview ? formatCents(overview.totalRevenueCents) : undefined },
    { label: "AI generations", value: overview?.totalAiGenerations },
    { label: "Social accounts", value: overview?.totalSocialAccounts },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{m.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{m.value ?? "…"}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Breakdown title="AI usage by provider" data={aiUsage} />
        <Breakdown title="Social accounts by platform" data={social} />
      </div>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data?: Record<string, number> }) {
  const entries = Object.entries(data ?? {});
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span>{k}</span><span className="font-medium">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
