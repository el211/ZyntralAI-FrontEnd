"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Plan, PlanCode } from "@/lib/types";
import { formatCents } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Interval = "MONTHLY" | "ANNUAL";

export default function BillingPage() {
  const { current } = useWorkspace();
  const [interval, setInterval] = useState<Interval>("MONTHLY");
  const [error, setError] = useState<string | null>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => unwrap<Plan[]>((await api.get("/billing/plans")).data),
  });

  const checkout = useMutation({
    mutationFn: async (plan: PlanCode) => {
      const origin = window.location.origin;
      const res = await api.post(`/workspaces/${current!.id}/billing/checkout`, {
        provider: "STRIPE",
        plan,
        interval,
        successUrl: `${origin}/dashboard/billing?status=success`,
        cancelUrl: `${origin}/dashboard/billing?status=cancel`,
      });
      return unwrap<{ url: string }>(res.data);
    },
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="text-sm text-muted-foreground">Current plan: {current.plan}</p>
        </div>
        <div className="flex rounded-md border p-1 text-sm">
          {(["MONTHLY", "ANNUAL"] as Interval[]).map((i) => (
            <button key={i}
              className={`rounded px-3 py-1 ${interval === i ? "bg-primary text-primary-foreground" : ""}`}
              onClick={() => setInterval(i)}>
              {i === "MONTHLY" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const price = interval === "ANNUAL" ? plan.annualPriceCents : plan.monthlyPriceCents;
          const isCurrent = current.plan === plan.code;
          return (
            <Card key={plan.code} className={isCurrent ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent && <span className="text-xs text-primary">Current</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">
                  {price === 0 ? "Free" : formatCents(price)}
                  {price > 0 && <span className="text-sm font-normal text-muted-foreground">/{interval === "ANNUAL" ? "yr" : "mo"}</span>}
                </div>
                <ul className="space-y-2 text-sm">
                  <Feature>{plan.aiCreditsMonthly.toLocaleString()} AI credits / mo</Feature>
                  <Feature>{plan.maxTeamMembers} team members</Feature>
                  <Feature>{plan.maxSocialAccounts} social accounts</Feature>
                  <Feature>{plan.maxWorkspaces} workspaces</Feature>
                </ul>
                <Button className="w-full" variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || plan.code === "FREE" || checkout.isPending}
                  onClick={() => checkout.mutate(plan.code)}>
                  {isCurrent ? "Current plan" : plan.code === "FREE" ? "Free" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="h-4 w-4 text-primary" /> {children}
    </li>
  );
}
