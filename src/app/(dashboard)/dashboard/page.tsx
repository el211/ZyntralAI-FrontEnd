"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { CreditUsage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, CreditCard, Share2 } from "lucide-react";

export default function OverviewPage() {
  const { current } = useWorkspace();

  const { data: credits } = useQuery({
    queryKey: ["credits", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<CreditUsage>((await api.get(`/workspaces/${current!.id}/ai/credits`)).data),
  });

  if (!current) return <p className="text-muted-foreground">Create a workspace to get started.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{current.name}</h1>
        <p className="text-sm text-muted-foreground">Plan: {current.plan} · Your role: {current.myRole}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">AI credits left</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">
            {credits ? `${credits.remaining}/${credits.limit}` : "…"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Team members</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{current.memberCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Plan</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{current.plan}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Role</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{current.myRole}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction href="/dashboard/ai" icon={Sparkles} label="Generate content" />
        <QuickAction href="/dashboard/social" icon={Share2} label="Connect accounts" />
        <QuickAction href="/dashboard/settings" icon={Users} label="Invite team" />
        <QuickAction href="/dashboard/billing" icon={CreditCard} label="Upgrade plan" />
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary">
        <CardContent className="flex items-center gap-3 p-5">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
