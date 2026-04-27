import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Building2,
  Radar,
  BrainCircuit,
  FileText,
  Network,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "AI 排行榜", href: "/", icon: LayoutDashboard },
  { name: "品牌庫", href: "/data-layer", icon: Building2 },
  { name: "AI 監測事件", href: "/events", icon: Radar },
  { name: "AI 策略引擎", href: "/decisions", icon: BrainCircuit },
  { name: "內容生成", href: "/content", icon: FileText },
  { name: "通路整合", href: "/distribution", icon: Network },
  { name: "深度分析", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-sidebar-foreground leading-none">AI 品牌能見度</div>
            <div className="text-xs text-sidebar-foreground/50 font-mono mt-0.5">台灣上市櫃指數</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-sidebar-foreground/50")} />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
          <Settings className="h-4 w-4 text-sidebar-foreground/50" />
          系統設定
        </div>
      </div>
    </div>
  );
}
