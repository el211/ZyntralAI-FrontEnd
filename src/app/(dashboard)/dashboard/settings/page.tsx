"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface Member { userId: string; role: string; joinedAt: string; }

export default function SettingsPage() {
  const { current } = useWorkspace();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [msg, setMsg] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["members", current?.id],
    enabled: !!current,
    queryFn: async () =>
      unwrap<Member[]>((await api.get(`/workspaces/${current!.id}/members`)).data),
  });

  const invite = useMutation({
    mutationFn: async () =>
      api.post(`/workspaces/${current!.id}/invitations`, { email, role }),
    onSuccess: () => { setMsg(`Invitation sent to ${email}`); setEmail(""); qc.invalidateQueries({ queryKey: ["members", current?.id] }); },
    onError: (err) => setMsg(apiErrorMessage(err)),
  });

  if (!current) return <p className="text-muted-foreground">Select a workspace first.</p>;
  const canManage = current.myRole === "OWNER" || current.myRole === "ADMIN";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{current.name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span>{current.plan}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Your role</span><span>{current.myRole}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Team members ({members.length})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between rounded-md bg-secondary p-3 text-sm">
                <span className="font-mono text-xs">{m.userId.slice(0, 8)}…</span>
                <span>{m.role}</span>
              </div>
            ))}
          </div>

          {canManage && (
            <div className="space-y-3 border-t pt-4">
              <Label>Invite by email</Label>
              <div className="flex gap-2">
                <Input type="email" placeholder="teammate@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
                <Select className="w-32" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="ADMIN">Admin</option>
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </Select>
                <Button disabled={!email || invite.isPending} onClick={() => invite.mutate()}>Invite</Button>
              </div>
              {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
