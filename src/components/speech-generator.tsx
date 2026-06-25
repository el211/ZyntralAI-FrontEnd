"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_URL, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Volume2, Download } from "lucide-react";

export const audioUrl = (id: string) => `${API_URL}/ai-audio/${id}`;

interface Voice { voiceId: string; name: string; }

export function SpeechGenerator() {
  const { current } = useWorkspace();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [audio, setAudio] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: voices = [] } = useQuery({
    queryKey: ["voices", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<Voice[]>((await api.get(`/workspaces/${current!.id}/ai/audio/voices`)).data),
  });

  const generate = useMutation({
    mutationFn: async () =>
      unwrap<{ id: string }>(
        (await api.post(`/workspaces/${current!.id}/ai/audio`, { text, voiceId: voiceId || null })).data,
      ),
    onSuccess: (data) => {
      setAudio(data);
      setError(null);
      qc.invalidateQueries({ queryKey: ["credits", current?.id] });
      qc.invalidateQueries({ queryKey: ["ai-audio", current?.id] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Text to speech</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Text</Label>
            <Textarea rows={7} placeholder="Type what you want spoken aloud…"
              value={text} maxLength={5000} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Voice</Label>
            <Select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
              <option value="">Default voice</option>
              {voices.map((v) => <option key={v.voiceId} value={v.voiceId}>{v.name}</option>)}
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={!text.trim() || generate.isPending} onClick={() => generate.mutate()}>
            <Volume2 className="h-4 w-4" /> {generate.isPending ? "Generating…" : "Generate speech"}
          </Button>
          <p className="text-xs text-muted-foreground">Each clip uses 3 credits.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Result</CardTitle></CardHeader>
        <CardContent>
          {audio ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={audioUrl(audio.id)} controls className="w-full" />
              <a href={audioUrl(audio.id)} download="speech.mp3" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Download</Button>
              </a>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Your audio will appear here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
