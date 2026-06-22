"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Page } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostComposer } from "@/components/post-composer";
import { Plus } from "lucide-react";

interface PostRow {
  id: string;
  title: string | null;
  body: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

const statusColor: Record<string, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  SCHEDULED: "bg-blue-500/15 text-blue-500",
  QUEUED: "bg-amber-500/15 text-amber-500",
  PUBLISHED: "bg-green-500/15 text-green-500",
  FAILED: "bg-destructive/15 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

export default function PostsPage() {
  const { current } = useWorkspace();
  const [composer, setComposer] = useState<{
    open: boolean; body: string; mediaUrl: string | null; aiGenerationId: string | null;
  }>({ open: false, body: "", mediaUrl: null, aiGenerationId: null });

  // Opened from AI Studio / Library "Use in a post" — content or an image is handed
  // over via sessionStorage, then we open the composer pre-filled and clear it.
  useEffect(() => {
    const raw = sessionStorage.getItem("zyntral_compose");
    if (raw) {
      sessionStorage.removeItem("zyntral_compose");
      try {
        const { body, mediaUrl, aiGenerationId } = JSON.parse(raw);
        setComposer({
          open: true,
          body: body ?? "",
          mediaUrl: mediaUrl ?? null,
          aiGenerationId: aiGenerationId ?? null,
        });
      } catch { /* ignore malformed payload */ }
    }
  }, []);

  const { data } = useQuery({
    queryKey: ["posts", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<Page<PostRow>>((await api.get(`/workspaces/${current!.id}/posts`)).data),
  });

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;
  const posts = data?.items ?? [];

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
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="font-medium">{p.title || "Untitled"}</div>
                  <div className="truncate text-sm text-muted-foreground">{p.body}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${statusColor[p.status] ?? ""}`}>
                  {p.status}
                </span>
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
    </div>
  );
}
