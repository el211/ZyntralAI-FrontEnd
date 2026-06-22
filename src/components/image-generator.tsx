"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_URL, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Download, Send } from "lucide-react";

export const imageUrl = (id: string) => `${API_URL}/ai-images/${id}`;

/** Fetch an image's bytes and ask the backend to return a transparent (background-removed) copy. */
export async function removeBgFromUrl(workspaceId: string, url: string) {
  const blob = await fetch(url).then((r) => r.blob());
  const fd = new FormData();
  fd.append("image", blob, "image.png");
  return unwrap<{ id: string }>(
    (await api.post(`/workspaces/${workspaceId}/ai/images/remove-background`, fd)).data,
  );
}

export function ImageGenerator({ kind }: { kind: "LOGO" | "BANNER" }) {
  const { current } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<{ id: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const label = kind === "LOGO" ? "logo" : "banner";

  const generate = useMutation({
    mutationFn: async () => {
      if (file) {
        const fd = new FormData();
        fd.append("kind", kind);
        fd.append("prompt", prompt);
        fd.append("image", file);
        return unwrap<{ id: string }>(
          (await api.post(`/workspaces/${current!.id}/ai/images/edit`, fd)).data,
        );
      }
      return unwrap<{ id: string }>(
        (await api.post(`/workspaces/${current!.id}/ai/images`, { kind, prompt })).data,
      );
    },
    onSuccess: (data) => {
      setImage(data);
      setError(null);
      qc.invalidateQueries({ queryKey: ["ai-images", current?.id] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const removeBg = useMutation({
    mutationFn: async (source: File | string) => {
      const fd = new FormData();
      if (typeof source === "string") {
        const blob = await fetch(source).then((r) => r.blob());
        fd.append("image", blob, "image.png");
      } else {
        fd.append("image", source);
      }
      return unwrap<{ id: string }>(
        (await api.post(`/workspaces/${current!.id}/ai/images/remove-background`, fd)).data,
      );
    },
    onSuccess: (data) => {
      setImage(data);
      setError(null);
      qc.invalidateQueries({ queryKey: ["ai-images", current?.id] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const busy = generate.isPending || removeBg.isPending;

  function attachToPost() {
    if (!image) return;
    sessionStorage.setItem("zyntral_compose", JSON.stringify({ mediaUrl: imageUrl(image.id) }));
    router.push("/dashboard/posts");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="capitalize">Generate {label}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{file ? `How should we improve your ${label}? (optional)` : `Describe your ${label}`}</Label>
            <Textarea
              rows={5}
              placeholder={file
                ? "e.g. make it cleaner and more modern, keep the colors"
                : kind === "LOGO"
                ? "e.g. a minimalist purple sparkle icon for an AI marketing app called Zyntral"
                : "e.g. a sleek dark-purple header with abstract AI shapes for a product launch"}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Improve an existing image (optional)</Label>
            <input type="file" accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm" />
            {file && (
              <p className="text-xs text-muted-foreground">
                Improving <span className="font-medium">{file.name}</span> ·{" "}
                <button type="button" className="underline" onClick={() => setFile(null)}>remove</button>
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {file ? (
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => generate.mutate()}>
                <Sparkles className="h-4 w-4" /> {generate.isPending ? "Working…" : `Improve ${label}`}
              </Button>
              <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => removeBg.mutate(file)}>
                {removeBg.isPending ? "Working…" : "Remove background"}
              </Button>
            </div>
          ) : (
            <Button className="w-full" disabled={!prompt || busy} onClick={() => generate.mutate()}>
              <Sparkles className="h-4 w-4" /> {generate.isPending ? "Generating…" : `Generate ${label}`}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Uses your OpenAI image credits.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Result</CardTitle></CardHeader>
        <CardContent>
          {image ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(image.id)} alt={label} className="w-full rounded-md border bg-secondary" />
              <div className="flex flex-wrap gap-2">
                <a href={imageUrl(image.id)} download={`${label}.png`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Download</Button>
                </a>
                <Button variant="secondary" size="sm" disabled={busy}
                  onClick={() => removeBg.mutate(imageUrl(image.id))}>
                  {removeBg.isPending ? "…" : "Remove background"}
                </Button>
                <Button size="sm" onClick={attachToPost}><Send className="h-4 w-4" /> Use in a post</Button>
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Your {label} will appear here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
