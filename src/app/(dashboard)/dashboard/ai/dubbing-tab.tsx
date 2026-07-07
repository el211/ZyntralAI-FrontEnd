"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { CredentialStatus, DubbingJob, DubbingStatus, Page } from "@/lib/types";
import { DUB_LANGUAGES, languageLabel } from "@/lib/languages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Languages, Download, KeyRound, Loader2, CheckCircle2, XCircle, Music } from "lucide-react";

const isActive = (s?: DubbingStatus) => s === "QUEUED" || s === "DUBBING";

export function DubbingTab() {
  const { current } = useWorkspace();
  const qc = useQueryClient();
  const wsId = current?.id;

  // --- ElevenLabs API key (BYOK, shared with the Speech tab) ---
  const { data: cred } = useQuery({
    queryKey: ["dub-cred", wsId],
    enabled: !!wsId,
    queryFn: async () =>
      unwrap<CredentialStatus>((await api.get(`/workspaces/${wsId}/dubbing/credential`)).data),
  });
  const configured = cred?.configured ?? false;

  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const saveKey = useMutation({
    mutationFn: async () =>
      api.put(`/workspaces/${wsId}/dubbing/credential`, { apiKey: keyInput.trim() }),
    onSuccess: () => {
      setKeyInput("");
      setShowKey(false);
      qc.invalidateQueries({ queryKey: ["dub-cred", wsId] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });
  const removeKey = useMutation({
    mutationFn: async () => api.delete(`/workspaces/${wsId}/dubbing/credential`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dub-cred", wsId] }),
    onError: (e) => setError(apiErrorMessage(e)),
  });

  // --- dub form ---
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("en");
  const [sourceLang, setSourceLang] = useState(""); // "" = auto-detect
  const [name, setName] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("file", file!);
      fd.append("targetLang", targetLang);
      if (sourceLang) fd.append("sourceLang", sourceLang);
      if (name) fd.append("name", name);
      return unwrap<DubbingJob>((await api.post(`/workspaces/${wsId}/dubbing`, fd)).data);
    },
    onSuccess: (job) => {
      setActiveJobId(job.id);
      setError(null);
      qc.invalidateQueries({ queryKey: ["dub-history", wsId] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  // poll the active job until it reaches a terminal state
  const job = useQuery({
    queryKey: ["dub-job", wsId, activeJobId],
    enabled: !!wsId && !!activeJobId,
    refetchInterval: (q) => (isActive(q.state.data?.status) ? 4000 : false),
    queryFn: async () =>
      unwrap<DubbingJob>((await api.get(`/workspaces/${wsId}/dubbing/${activeJobId}`)).data),
  });

  const history = useQuery({
    queryKey: ["dub-history", wsId],
    enabled: !!wsId,
    refetchInterval: job.data && isActive(job.data.status) ? 5000 : false,
    queryFn: async () =>
      unwrap<Page<DubbingJob>>((await api.get(`/workspaces/${wsId}/dubbing`)).data),
  });

  const [downloading, setDownloading] = useState(false);
  async function download(jobId: string) {
    setDownloading(true);
    try {
      const res = await api.get(`/workspaces/${wsId}/dubbing/${jobId}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dubbed-${jobId}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;

  const activeJob = job.data;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" /> Dub an audio file
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Audio file (MP3)</Label>
            <Input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Spoken language</Label>
              <Select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
                <option value="">Auto-detect</option>
                {DUB_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Translate to</Label>
              <Select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                {DUB_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Name (optional)</Label>
            <Input
              placeholder="e.g. Intro video"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            disabled={!file || !configured || submit.isPending}
            onClick={() => submit.mutate()}
          >
            <Languages className="h-4 w-4" />
            {submit.isPending ? "Uploading…" : "Dub audio"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {configured
              ? "Keeps the original speaker's voice — uses your ElevenLabs key, no Zyntral credits. Longer files take a few minutes."
              : "Add your ElevenLabs key below to start dubbing."}
          </p>

          {/* ElevenLabs key — same key as the Speech tab */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4" /> Your ElevenLabs key
              {configured && (
                <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-500">
                  Active
                </span>
              )}
            </div>
            {configured ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Dubbing uses your key (no credits) — shared with Speech.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={removeKey.isPending}
                  onClick={() => removeKey.mutate()}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="sk_…"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
                <Button size="sm" variant="outline" onClick={() => setShowKey((s) => !s)}>
                  {showKey ? "Hide" : "Show"}
                </Button>
                <Button
                  size="sm"
                  disabled={!keyInput.trim() || saveKey.isPending}
                  onClick={() => saveKey.mutate()}
                >
                  Save
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Stored encrypted. Get one at elevenlabs.io → API Keys. Same key as the Speech tab;
              dubbing needs an ElevenLabs plan that allows dubbing.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
        </CardHeader>
        <CardContent>
          {!activeJob ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Your dubbed audio will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {activeJob.status === "DUBBED" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {activeJob.status === "FAILED" && <XCircle className="h-4 w-4 text-destructive" />}
                {isActive(activeJob.status) && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {activeJob.status === "DUBBED"
                    ? "Done"
                    : activeJob.status === "FAILED"
                      ? "Failed"
                      : "Dubbing…"}{" "}
                  · {languageLabel(activeJob.sourceLang)} → {languageLabel(activeJob.targetLang)}
                </span>
              </div>
              {activeJob.status === "FAILED" && activeJob.error && (
                <p className="text-sm text-destructive">{activeJob.error}</p>
              )}
              {activeJob.status === "DUBBED" && (
                <Button disabled={downloading} onClick={() => download(activeJob.id)}>
                  <Download className="h-4 w-4" />
                  {downloading ? "Preparing…" : "Download dubbed audio"}
                </Button>
              )}
            </div>
          )}

          {history.data && history.data.items.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recent</p>
              {history.data.items.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setActiveJobId(h.id)}
                  className="flex w-full items-center justify-between rounded-md border border-input px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <span className="truncate">
                    {h.name || "Untitled"} · {languageLabel(h.sourceLang)} →{" "}
                    {languageLabel(h.targetLang)}
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">{h.status}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
