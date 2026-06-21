"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "./api";
import { Workspace } from "./types";

interface WorkspaceContextValue {
  workspaces: Workspace[];
  current: Workspace | null;
  setCurrent: (id: string) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentId, setCurrentId] = useState<string | null>(null);

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => unwrap<Workspace[]>((await api.get("/workspaces")).data),
  });

  useEffect(() => {
    if (!currentId && workspaces.length > 0) {
      const stored = localStorage.getItem("zyntral_ws");
      const found = workspaces.find((w) => w.id === stored);
      setCurrentId(found ? found.id : workspaces[0].id);
    }
  }, [workspaces, currentId]);

  function setCurrent(id: string) {
    setCurrentId(id);
    localStorage.setItem("zyntral_ws", id);
  }

  const current = workspaces.find((w) => w.id === currentId) ?? null;

  return (
    <WorkspaceContext.Provider value={{ workspaces, current, setCurrent, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
