"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_URL, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Volume2, Download, KeyRound } from "lucide-react";

export const audioUrl = (id: string) => `${API_URL}/ai-audio/${id}`;

interface Voice { voiceId: string; name: string; }

export function SpeechGenerator() {
  const { current } = useWorkspace();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [audio, setAudio] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { data: keyStatus } = useQuery({
    queryKey: ["tts-key", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<{ usingOwnKey: boolean }>((await api.get(`/workspaces/${current!.id}/ai/audio/key`)).data),
  });
  const usingOwnKey = keyStatus?.usingOwnKey ?? false;

  const saveKey = useMutation({
    mutationFn: async () => api.put(`/workspaces/${current!.id}/ai/audio/key`, { apiKey: keyInput.trim() }),
    onSuccess: () => {
      setKeyInput(""); setShowKey(false);
      qc.invalidateQueries({ queryKey: ["tts-key", current?.id] });
      qc.invalidateQueries({ queryKey: ["voices", current?.id] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });
  const removeKey = useMutation({
    mutationFn: async () => api.delete(`/workspaces/${current!.id}/ai/audio/key`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tts-key", current?.id] });
      qc.invalidateQueries({ queryKey: ["voices", current?.id] });
    },
  });

  const { data: voices = [] } = useQuery({
    queryKey: ["voices", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<Voice[]>((await api.get(`/workspaces/${current!.id}/ai/audio/voices`)).data),
  });

  const [cloneName, setCloneName] = useState("");
  const [cloneFiles, setCloneFiles] = useState<FileList | null>(null);
  const clone = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("name", cloneName.trim());
      Array.from(cloneFiles ?? []).forEach((f) => fd.append("files", f));
      return unwrap<Voice>((await api.post(`/workspaces/${current!.id}/ai/audio/voices/clone`, fd)).data);
    },
    onSuccess: (v) => {
      setCloneName(""); setCloneFiles(null); setError(null);
      qc.invalidateQueries({ queryKey: ["voices", current?.id] });
      setVoiceId(v.voiceId);
    },
    onError: (err) => setError(apiErrorMessage(err)),
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
          <p className="text-xs text-muted-foreground">
            {usingOwnKey
              ? "Using your own ElevenLabs key — no Zyntral credits used."
              : "Each clip uses 3 credits, or add your own ElevenLabs key below to use none."}
          </p>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4" /> Your ElevenLabs key
              {usingOwnKey && <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-500">Active</span>}
            </div>
            {usingOwnKey ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Generations use your key (no credits).</span>
                <Button size="sm" variant="outline" disabled={removeKey.isPending} onClick={() => removeKey.mutate()}>
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input type={showKey ? "text" : "password"} placeholder="sk_…"
                  value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
                <Button size="sm" variant="outline" onClick={() => setShowKey((s) => !s)}>{showKey ? "Hide" : "Show"}</Button>
                <Button size="sm" disabled={!keyInput.trim() || saveKey.isPending} onClick={() => saveKey.mutate()}>Save</Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Stored encrypted. Get one at elevenlabs.io → API Keys.</p>
          </div>

          {usingOwnKey && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="text-sm font-medium">Clone your voice</div>
              <Input placeholder="Voice name (e.g. My voice)"
                value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
              <input type="file" accept="audio/*" multiple
                onChange={(e) => setCloneFiles(e.target.files)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm" />
              <Button size="sm" disabled={!cloneName.trim() || !cloneFiles?.length || clone.isPending}
                onClick={() => clone.mutate()}>
                {clone.isPending ? "Cloning…" : "Create cloned voice"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Upload 1+ min of clean speech. Needs a paid ElevenLabs plan with cloning. The voice is added to your account and appears in the dropdown above.
              </p>
            </div>
          )}
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
