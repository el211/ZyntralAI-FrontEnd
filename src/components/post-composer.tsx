"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { imageUrl } from "@/components/image-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SocialAccount {
  id: string;
  platform: string;
  displayName: string | null;
  handle: string | null;
  status: string;
}

/**
 * Compose a post from scratch or from AI-generated content, target one or more
 * connected social accounts, and save as draft / schedule / publish now. The
 * backend creates a draft first, then schedules or publishes it.
 */
export function PostComposer({
  open,
  onClose,
  initialBody = "",
  initialMediaUrl,
  aiGenerationId,
}: {
  open: boolean;
  onClose: () => void;
  initialBody?: string;
  initialMediaUrl?: string | null;
  aiGenerationId?: string | null;
}) {
  const { current } = useWorkspace();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(initialBody);
  const [mediaUrl, setMediaUrl] = useState<string | null>(initialMediaUrl ?? null);
  const [selected, setSelected] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setBody(initialBody);
      setMediaUrl(initialMediaUrl ?? null);
    }
  }, [open, initialBody, initialMediaUrl]);

  async function onPickImage(f: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", f);
      const { id } = unwrap<{ id: string }>(
        (await api.post(`/workspaces/${current!.id}/ai/images/upload`, fd)).data,
      );
      setMediaUrl(imageUrl(id));
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  const { data: accounts = [] } = useQuery({
    queryKey: ["social-accounts", current?.id],
    enabled: !!current && open,
    queryFn: async () =>
      unwrap<SocialAccount[]>((await api.get(`/workspaces/${current!.id}/social-accounts`)).data),
  });

  const connected = accounts.filter((a) => a.status === "CONNECTED");

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function reset() {
    setTitle("");
    setBody("");
    setMediaUrl(null);
    setSelected([]);
    setScheduledAt("");
    setError(null);
  }

  const save = useMutation({
    mutationFn: async (action: "draft" | "publish" | "schedule") => {
      const post = unwrap<{ id: string }>(
        (await api.post(`/workspaces/${current!.id}/posts`, {
          title: title || null,
          body,
          socialAccountIds: selected,
          aiGenerationId: aiGenerationId ?? null,
          media: mediaUrl ? [{ url: mediaUrl, mediaType: "image/png", altText: null }] : null,
        })).data,
      );
      if (action === "publish") {
        await api.post(`/workspaces/${current!.id}/posts/${post.id}/publish`);
      } else if (action === "schedule") {
        await api.post(`/workspaces/${current!.id}/posts/${post.id}/schedule`, {
          scheduledAt: new Date(scheduledAt).toISOString(),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts", current?.id] });
      reset();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  if (!open) return null;

  const canSubmit = (body.trim().length > 0 || !!mediaUrl) && selected.length > 0 && !save.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">New post</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-title">Title (optional)</Label>
            <Input id="post-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-body">Content</Label>
            <Textarea id="post-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {mediaUrl ? (
            <div className="space-y-2">
              <Label>Attached image</Label>
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl} alt="attachment" className="max-h-40 rounded-md border" />
                <button type="button" onClick={() => setMediaUrl(null)}
                  className="absolute right-1 top-1 rounded bg-background/80 px-1.5 py-0.5 text-xs">Remove</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Add an image (optional)</Label>
              <input type="file" accept="image/*" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); }}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm" />
              {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
              <p className="text-xs text-muted-foreground">Or generate one in AI Studio / pick from the Library.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Publish to</Label>
            {connected.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No connected accounts.{" "}
                <Link href="/dashboard/social" className="text-primary underline">Connect one</Link>.
              </p>
            ) : (
              <div className="space-y-1">
                {connected.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                    <span className="font-medium">{a.platform}</span>
                    <span className="text-muted-foreground">{a.displayName || a.handle || ""}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-schedule">Schedule for (optional)</Label>
            <Input id="post-schedule" type="datetime-local" value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" disabled={!canSubmit} onClick={() => save.mutate("draft")}>
            Save draft
          </Button>
          <Button variant="secondary" disabled={!canSubmit || !scheduledAt} onClick={() => save.mutate("schedule")}>
            Schedule
          </Button>
          <Button disabled={!canSubmit} onClick={() => save.mutate("publish")}>
            {save.isPending ? "Working…" : "Publish now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
