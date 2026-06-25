"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, unwrap } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { imageUrl, removeBgFromUrl } from "@/components/image-generator";
import { videoUrl } from "@/components/video-generator";
import { audioUrl } from "@/components/speech-generator";
import { Download, Send, Scissors, Loader2, Film } from "lucide-react";

interface ImageItem { id: string; kind: string; prompt: string; createdAt: string; }
interface VideoItem { id: string; status: string; prompt: string; error: string | null; createdAt: string; }
interface AudioItem { id: string; textExcerpt: string; voice: string | null; createdAt: string; }

export default function LibraryPage() {
  const { current } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: images = [] } = useQuery({
    queryKey: ["ai-images", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<ImageItem[]>((await api.get(`/workspaces/${current!.id}/ai/images`)).data),
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["ai-videos", current?.id],
    enabled: !!current,
    refetchInterval: (q) => {
      const list = (q.state.data as VideoItem[] | undefined) ?? [];
      return list.some((v) => v.status === "PENDING" || v.status === "PROCESSING") ? 8000 : false;
    },
    queryFn: async () =>
      unwrap<VideoItem[]>((await api.get(`/workspaces/${current!.id}/ai/videos`)).data),
  });

  const { data: clips = [] } = useQuery({
    queryKey: ["ai-audio", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<AudioItem[]>((await api.get(`/workspaces/${current!.id}/ai/audio`)).data),
  });

  const removeBg = useMutation({
    mutationFn: (id: string) => removeBgFromUrl(current!.id, imageUrl(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-images", current?.id] }),
  });

  const extend = useMutation({
    mutationFn: (id: string) => api.post(`/workspaces/${current!.id}/ai/videos/${id}/extend`, { prompt: "" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-videos", current?.id] }),
  });

  function attachToPost(id: string) {
    sessionStorage.setItem("zyntral_compose", JSON.stringify({ mediaUrl: imageUrl(id) }));
    router.push("/dashboard/posts");
  }

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Library</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Images</h2>
        {images.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            No images yet. Generate a logo or banner in the AI Studio.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <Card key={img.id}>
                <CardContent className="space-y-2 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img.id)} alt={img.prompt}
                    className="aspect-square w-full rounded-md border bg-secondary object-contain" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{img.kind}</span>
                    <div className="flex gap-1">
                      <a href={imageUrl(img.id)} download={`${img.kind.toLowerCase()}.png`} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" title="Download"><Download className="h-4 w-4" /></Button>
                      </a>
                      <Button variant="ghost" size="sm" title="Remove background"
                        disabled={removeBg.isPending} onClick={() => removeBg.mutate(img.id)}>
                        <Scissors className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => attachToPost(img.id)}>
                        <Send className="h-4 w-4" /> Use
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Videos</h2>
        {videos.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            No videos yet. Generate one in the AI Studio → Video tab.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <Card key={v.id}>
                <CardContent className="space-y-2 p-3">
                  {v.status === "COMPLETED" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={videoUrl(v.id)} controls className="aspect-video w-full rounded-md border bg-black" />
                  ) : v.status === "FAILED" ? (
                    <div className="flex aspect-video w-full items-center justify-center rounded-md border bg-secondary p-2 text-center text-xs text-destructive">
                      {v.error || "Failed"}
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center gap-2 rounded-md border bg-secondary text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{v.prompt}</span>
                    {v.status === "COMPLETED" && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="Extend (+~7s, 50 credits)"
                          disabled={extend.isPending} onClick={() => extend.mutate(v.id)}>
                          <Film className="h-4 w-4" />
                        </Button>
                        <a href={videoUrl(v.id)} download="video.mp4" target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" title="Download"><Download className="h-4 w-4" /></Button>
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Voiceovers</h2>
        {clips.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            No audio yet. Generate speech in the AI Studio → Speech tab.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clips.map((a) => (
              <Card key={a.id}>
                <CardContent className="space-y-2 p-3">
                  <p className="line-clamp-2 text-sm">{a.textExcerpt}</p>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio src={audioUrl(a.id)} controls className="w-full" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{a.voice || "voice"}</span>
                    <a href={audioUrl(a.id)} download="speech.mp3" target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm" title="Download"><Download className="h-4 w-4" /></Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
