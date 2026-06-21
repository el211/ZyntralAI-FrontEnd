"use client";

import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PostRow { id: string; title: string | null; body: string; scheduledAt: string | null; status: string; }

export default function CalendarPage() {
  const { current } = useWorkspace();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59).toISOString();

  const { data: posts = [] } = useQuery({
    queryKey: ["calendar", current?.id, from],
    enabled: !!current,
    queryFn: async () =>
      unwrap<PostRow[]>(
        (await api.get(`/workspaces/${current!.id}/posts/calendar`, { params: { from, to } })).data,
      ),
  });

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;

  const byDay = posts.reduce<Record<string, PostRow[]>>((acc, p) => {
    if (!p.scheduledAt) return acc;
    const day = new Date(p.scheduledAt).toLocaleDateString();
    (acc[day] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Content calendar — {now.toLocaleString("en-US", { month: "long", year: "numeric" })}
      </h1>
      {Object.keys(byDay).length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          No scheduled posts this month.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDay).map(([day, items]) => (
            <Card key={day}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{day}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {items.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md bg-secondary p-3 text-sm">
                    <span className="truncate">{p.title || p.body.slice(0, 60)}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.scheduledAt && new Date(p.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
