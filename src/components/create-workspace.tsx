"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, apiErrorMessage } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Workspace } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Modal to create a workspace. Used both from the empty-state (a user with no
 * workspace) and the "+ New workspace" entry in the switcher. On success it
 * refreshes the workspace list and switches to the newly created one.
 */
export function CreateWorkspaceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { setCurrent } = useWorkspace();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () =>
      unwrap<Workspace>((await api.post("/workspaces", { name: name.trim() })).data),
    onSuccess: async (ws) => {
      setError(null);
      setName("");
      await qc.invalidateQueries({ queryKey: ["workspaces"] });
      setCurrent(ws.id);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Create workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A workspace holds your content, team, and billing.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="ws-name">Workspace name</Label>
          <Input
            id="ws-name"
            autoFocus
            placeholder="My Company"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim() && !create.isPending) create.mutate();
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
