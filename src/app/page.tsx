import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles, CalendarClock, Users, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" /> Zyntral AI
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link href="/register"><Button>Get started</Button></Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          AI marketing automation, done right
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Create, schedule & publish content with{" "}
          <span className="text-primary">artificial intelligence</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Generate on-brand posts for every network, plan your calendar, collaborate with your team,
          and grow — all from one workspace.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register"><Button size="lg">Start free</Button></Link>
          <Link href="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
        </div>

        <div className="mt-20 grid w-full max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Sparkles, title: "AI generation", text: "Posts, captions, copy & more" },
            { icon: CalendarClock, title: "Scheduling", text: "Plan and auto-publish" },
            { icon: Users, title: "Teams", text: "Workspaces & roles" },
            { icon: BarChart3, title: "Analytics", text: "Track performance" },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border p-5 text-left">
              <f.icon className="mb-3 h-6 w-6 text-primary" />
              <div className="font-medium">{f.title}</div>
              <div className="text-sm text-muted-foreground">{f.text}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Zyntral AI
      </footer>
    </div>
  );
}
