"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, unwrap } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { imageUrl, removeBgFromUrl } from "@/components/image-generator";
import { Download, Send, Scissors } from "lucide-react";

interface ImageItem {
  id: string;
  kind: string;
  prompt: string;
  createdAt: string;
}

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

  const removeBg = useMutation({
    mutationFn: (id: string) => removeBgFromUrl(current!.id, imageUrl(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-images", current?.id] }),
  });

  function attachToPost(id: string) {
    sessionStorage.setItem("zyntral_compose", JSON.stringify({ mediaUrl: imageUrl(id) }));
    router.push("/dashboard/posts");
  }

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Library</h1>
      {images.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
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
    </div>
  );
}
