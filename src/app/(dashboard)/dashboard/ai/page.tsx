"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { AiContentKind, AiLength, AiTone, CreditUsage, GenerationResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Copy, Send } from "lucide-react";
import { ImageGenerator } from "@/components/image-generator";
import { VideoGenerator } from "@/components/video-generator";
import { SpeechGenerator } from "@/components/speech-generator";

const TABS = [
  { id: "TEXT", label: "Text" },
  { id: "LOGO", label: "Logo" },
  { id: "BANNER", label: "Banner" },
  { id: "VIDEO", label: "Video" },
  { id: "SPEECH", label: "Speech" },
] as const;
type StudioTab = (typeof TABS)[number]["id"];

const KINDS: AiContentKind[] = [
  "LINKEDIN_POST", "X_POST", "INSTAGRAM_CAPTION", "TIKTOK_IDEA", "FACEBOOK_POST",
  "MARKETING_COPY", "PRODUCT_DESCRIPTION", "EMAIL_CAMPAIGN", "BLOG_OUTLINE", "CTA", "HASHTAGS",
];
const TONES: AiTone[] = ["PROFESSIONAL", "FRIENDLY", "CORPORATE", "CASUAL", "SALES", "MARKETING", "TECHNICAL"];
const LENGTHS: AiLength[] = ["SHORT", "MEDIUM", "LONG"];

const pretty = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function AiStudioPage() {
  const { current } = useWorkspace();
  const qc = useQueryClient();
  const router = useRouter();

  function sendToPost(r: GenerationResult) {
    sessionStorage.setItem("zyntral_compose", JSON.stringify({ body: r.output, aiGenerationId: r.id }));
    router.push("/dashboard/posts");
  }
  const [form, setForm] = useState({
    contentKind: "LINKEDIN_POST" as AiContentKind,
    tone: "PROFESSIONAL" as AiTone,
    length: "MEDIUM" as AiLength,
    language: "en",
    topic: "",
    provider: "ANTHROPIC" as "ANTHROPIC" | "OPENAI" | "GEMINI",
  });
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StudioTab>("TEXT");

  const { data: credits } = useQuery({
    queryKey: ["credits", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<CreditUsage>((await api.get(`/workspaces/${current!.id}/ai/credits`)).data),
  });

  const generate = useMutation({
    mutationFn: async () =>
      unwrap<GenerationResult>(
        (await api.post(`/workspaces/${current!.id}/ai/generate`, form)).data,
      ),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      qc.invalidateQueries({ queryKey: ["credits", current?.id] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AI Studio</h1>
        {credits && (
          <span className="text-sm text-muted-foreground">
            {credits.remaining}/{credits.limit} credits left
          </span>
        )}
      </div>

      <div className="flex w-fit gap-1 rounded-md border p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded px-3 py-1.5 text-sm ${tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "LOGO" || tab === "BANNER") && <ImageGenerator kind={tab} />}
      {tab === "VIDEO" && <VideoGenerator />}
      {tab === "SPEECH" && <SpeechGenerator />}

      {tab === "TEXT" && (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Generate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Content type</Label>
                <Select value={form.contentKind}
                  onChange={(e) => setForm({ ...form, contentKind: e.target.value as AiContentKind })}>
                  {KINDS.map((k) => <option key={k} value={k}>{pretty(k)}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>AI model</Label>
                <Select value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value as "ANTHROPIC" | "OPENAI" | "GEMINI" })}>
                  <option value="ANTHROPIC">Claude (Anthropic)</option>
                  <option value="OPENAI">ChatGPT (OpenAI)</option>
                  <option value="GEMINI">Gemini (Google)</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value as AiTone })}>
                  {TONES.map((t) => <option key={t} value={t}>{pretty(t)}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Length</Label>
                <Select value={form.length}
                  onChange={(e) => setForm({ ...form, length: e.target.value as AiLength })}>
                  {LENGTHS.map((l) => <option key={l} value={l}>{pretty(l)}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Topic / brief</Label>
              <Textarea rows={5} placeholder="What should we write about?"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={!form.topic || generate.isPending}
              onClick={() => generate.mutate()}>
              <Sparkles className="h-4 w-4" />
              {generate.isPending ? "Generating…" : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Result</CardTitle>
            {result && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm"
                  onClick={() => navigator.clipboard.writeText(result.output)}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
                <Button size="sm" onClick={() => sendToPost(result)}>
                  <Send className="h-4 w-4" /> Use in a post
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-3">
                <pre className="whitespace-pre-wrap rounded-md bg-secondary p-4 text-sm">{result.output}</pre>
                <p className="text-xs text-muted-foreground">
                  {result.provider} · {result.model} · {result.outputTokens} tokens · {result.creditsCost} credit(s)
                </p>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Your generated content will appear here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
