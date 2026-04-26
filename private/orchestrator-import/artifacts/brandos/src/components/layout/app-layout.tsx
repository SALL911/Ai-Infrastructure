import { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border px-6 bg-card/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2" />
            <span className="text-xs text-muted-foreground font-mono">系統運行中 — 即時追蹤 AI 引擎能見度</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted-foreground font-mono">
              {new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
            </div>
            <div className="h-8 w-8 rounded-full bg-sidebar-accent border border-border flex items-center justify-center">
              <span className="text-xs font-medium">台</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
