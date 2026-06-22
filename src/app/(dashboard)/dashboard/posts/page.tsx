"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Page } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostComposer } from "@/components/post-composer";
import { Plus, Eye, Send, Trash2, Ban, X, ExternalLink } from "lucide-react";

interface Target {
  id: string;
  socialAccountId: string;
  status: string;
  permalink: string | null;
  error: string | null;
}
interface Media { url: string; mediaType: string; altText: string | null; }
interface Post {
  id: string;
  title: string | null;
  body: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  targets: Target[];
  media: Media[];
  createdAt: string;
}
interface Account { id: string; platform: string; displayName: string | null; }

const statusColor: Record<string, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  SCHEDULED: "bg-blue-500/15 text-blue-500",
  QUEUED: "bg-amber-500/15 text-amber-500",
  PUBLISHING: "bg-amber-500/15 text-amber-500",
  PUBLISHED: "bg-green-500/15 text-green-500",
  FAILED: "bg-destructive/15 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

export default function PostsPage() {
  const { current } = useWorkspace();
  const qc = useQueryClient();
  const [composer, setComposer] = useState<{
    open: boolean; body: string; mediaUrl: string | null; aiGenerationId: string | null;
  }>({ open: false, body: "", mediaUrl: null, aiGenerationId: null });
  const [viewing, setViewing] = useState<Post | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("zyntral_compose");
    if (raw) {
      sessionStorage.removeItem("zyntral_compose");
      try {
        const { body, mediaUrl, aiGenerationId } = JSON.parse(raw);
        setComposer({ open: true, body: body ?? "", mediaUrl: mediaUrl ?? null, aiGenerationId: aiGenerationId ?? null });
      } catch { /* ignore */ }
    }
  }, []);

  const { data } = useQuery({
    queryKey: ["posts", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<Page<Post>>((await api.get(`/workspaces/${current!.id}/posts`)).data),
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["social-accounts", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<Account[]>((await api.get(`/workspaces/${current!.id}/social-accounts`)).data),
  });

  const posts = data?.items ?? [];
  const accountLabel = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    if (!a) return "Account";
    return a.displayName ? `${a.platform} · ${a.displayName}` : a.platform;
  };

  const onDone = () => { qc.invalidateQueries({ queryKey: ["posts", current?.id] }); setViewing(null); };
  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/workspaces/${current!.id}/posts/${id}/publish`),
    onSuccess: onDone,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/workspaces/${current!.id}/posts/${id}/cancel`),
    onSuccess: onDone,
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${current!.id}/posts/${id}`),
    onSuccess: onDone,
  });

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;

  const canPublish = (s: string) => s === "DRAFT" || s === "SCHEDULED";
  const canCancel = (s: string) => s === "SCHEDULED" || s === "QUEUED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Posts</h1>
        <Button onClick={() => setComposer({ open: true, body: "", mediaUrl: null, aiGenerationId: null })}>
          <Plus className="h-4 w-4" /> New post
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          No posts yet. Click “New post”, or generate content in the AI Studio and turn it into a post.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Card key={p.id} className="flex flex-col overflow-hidden">
              {p.media[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.media[0].url} alt="" className="aspect-video w-full border-b bg-secondary object-cover" />
              )}
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-medium">{p.title || "Untitled"}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${statusColor[p.status] ?? ""}`}>
                    {p.status}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{p.body}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {p.scheduledAt ? `⏱ ${fmt(p.scheduledAt)}` : fmt(p.createdAt)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setViewing(p)}>
                    <Eye className="h-4 w-4" /> View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PostComposer
        open={composer.open}
        onClose={() => setComposer((c) => ({ ...c, open: false }))}
        initialBody={composer.body}
        initialMediaUrl={composer.mediaUrl}
        aiGenerationId={composer.aiGenerationId}
      />

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewing(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">{viewing.title || "Untitled"}</h2>
              <button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs ${statusColor[viewing.status] ?? ""}`}>
              {viewing.status}
            </span>

            {viewing.media[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.media[0].url} alt="" className="mt-4 w-full rounded-md border bg-secondary" />
            )}

            <pre className="mt-4 whitespace-pre-wrap rounded-md bg-secondary p-3 text-sm">{viewing.body}</pre>

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Scheduled</span><span>{fmt(viewing.scheduledAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Published</span><span>{fmt(viewing.publishedAt)}</span></div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Destinations</p>
              {viewing.targets.length === 0 && <p className="text-sm text-muted-foreground">No destinations.</p>}
              {viewing.targets.map((t) => (
                <div key={t.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{accountLabel(t.socialAccountId)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[t.status] ?? "bg-secondary"}`}>{t.status}</span>
                  </div>
                  {t.permalink && (
                    <a href={t.permalink} target="_blank" rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline">
                      <ExternalLink className="h-3 w-3" /> View on platform
                    </a>
                  )}
                  {t.error && <p className="mt-1 text-xs text-destructive">{t.error}</p>}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {canPublish(viewing.status) && (
                <Button size="sm" disabled={publish.isPending} onClick={() => publish.mutate(viewing.id)}>
                  <Send className="h-4 w-4" /> Publish now
                </Button>
              )}
              {canCancel(viewing.status) && (
                <Button variant="outline" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(viewing.id)}>
                  <Ban className="h-4 w-4" /> Cancel
                </Button>
              )}
              <Button variant="destructive" size="sm" disabled={del.isPending} onClick={() => del.mutate(viewing.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
