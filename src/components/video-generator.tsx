"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_URL, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Download, Loader2 } from "lucide-react";

export const videoUrl = (id: string) => `${API_URL}/videos/${id}`;

interface Video { id: string; status: string; prompt: string; error: string | null; createdAt: string; }

const terminal = (s?: string) => s === "COMPLETED" || s === "FAILED";

export function VideoGenerator() {
  const { current } = useWorkspace();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: async () =>
      unwrap<Video>((await api.post(`/workspaces/${current!.id}/ai/videos`, { prompt })).data),
    onSuccess: (v) => {
      setJobId(v.id);
      setError(null);
      qc.invalidateQueries({ queryKey: ["credits", current?.id] });
      qc.invalidateQueries({ queryKey: ["ai-videos", current?.id] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const { data: job } = useQuery({
    queryKey: ["ai-video", jobId],
    enabled: !!jobId && !!current,
    refetchInterval: (q) => (terminal((q.state.data as Video | undefined)?.status) ? false : 5000),
    queryFn: async () =>
      unwrap<Video>((await api.get(`/workspaces/${current!.id}/ai/videos/${jobId}`)).data),
  });

  const status = job?.status;
  const working = generate.isPending || (!!jobId && !terminal(status));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Generate video</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Describe your video (≈8-second clip)</Label>
            <Textarea rows={6}
              placeholder="e.g. a cinematic flythrough of a futuristic city at sunset, smooth camera motion"
              value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {status === "FAILED" && <p className="text-sm text-destructive">{job?.error || "Generation failed"}</p>}
          <Button className="w-full" disabled={!prompt || working} onClick={() => generate.mutate()}>
            <Sparkles className="h-4 w-4" /> {working ? "Generating…" : "Generate video"}
          </Button>
          <p className="text-xs text-muted-foreground">Each video uses 50 credits · ~8 seconds · takes 1–3 minutes.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Result</CardTitle></CardHeader>
        <CardContent>
          {status === "COMPLETED" && jobId ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl(jobId)} controls className="w-full rounded-md border bg-black" />
              <a href={videoUrl(jobId)} download="video.mp4" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Download</Button>
              </a>
            </div>
          ) : working ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              Generating your video… this can take 1–3 minutes.
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Your video will appear here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
