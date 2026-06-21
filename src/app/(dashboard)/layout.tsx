"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CreateWorkspaceModal } from "@/components/create-workspace";
import { Plus } from "lucide-react";

const NEW_WS = "__new_workspace__";

function Topbar({ onNewWorkspace }: { onNewWorkspace: () => void }) {
  const { workspaces, current, setCurrent } = useWorkspace();
  const { user } = useAuth();
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <Select
        className="w-56"
        value={current?.id ?? ""}
        onChange={(e) => {
          if (e.target.value === NEW_WS) { onNewWorkspace(); return; }
          setCurrent(e.target.value);
        }}
      >
        {workspaces.length === 0 && <option value="">No workspace</option>}
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>{w.name} · {w.plan}</option>
        ))}
        <option value={NEW_WS}>+ New workspace</option>
      </Select>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user?.email}</span>
        <ThemeToggle />
      </div>
    </header>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Create your first workspace</h1>
        <p className="text-sm text-muted-foreground">
          A workspace is where your content, team, and billing live. Create one to get started.
        </p>
        <Button onClick={onCreate}><Plus className="h-4 w-4" /> Create workspace</Button>
      </div>
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { workspaces, isLoading } = useWorkspace();
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (workspaces.length === 0) {
    return (
      <>
        <EmptyState onCreate={() => setModalOpen(true)} />
        <CreateWorkspaceModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar onNewWorkspace={() => setModalOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <CreateWorkspaceModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <WorkspaceProvider>
      <DashboardShell>{children}</DashboardShell>
    </WorkspaceProvider>
  );
}
