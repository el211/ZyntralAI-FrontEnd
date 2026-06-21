"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Select } from "@/components/ui/select";

function Topbar() {
  const { workspaces, current, setCurrent } = useWorkspace();
  const { user } = useAuth();
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <Select
        className="w-56"
        value={current?.id ?? ""}
        onChange={(e) => setCurrent(e.target.value)}
      >
        {workspaces.length === 0 && <option>No workspace</option>}
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>{w.name} · {w.plan}</option>
        ))}
      </Select>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user?.email}</span>
        <ThemeToggle />
      </div>
    </header>
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
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
