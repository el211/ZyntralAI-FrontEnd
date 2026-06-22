"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Sparkles, FileText, CalendarDays, Share2,
  CreditCard, Settings, Shield, LogOut, Images,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/ai", label: "AI Studio", icon: Sparkles },
  { href: "/dashboard/library", label: "Library", icon: Images },
  { href: "/dashboard/posts", label: "Posts", icon: FileText },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/social", label: "Social accounts", icon: Share2 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = user?.roles?.includes("ADMIN");

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-5 py-4 font-semibold">
        <Sparkles className="h-5 w-5 text-primary" /> Zyntral AI
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname.startsWith("/dashboard/admin")
                ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
            )}
          >
            <Shield className="h-4 w-4" /> Admin
          </Link>
        )}
      </nav>
      <button
        onClick={logout}
        className="m-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </aside>
  );
}
