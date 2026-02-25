import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Radio, 
  Settings, 
  Terminal, 
  Activity,
  LineChart,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Signals', href: '/signals', icon: Radio },
  { name: 'Active Trades', href: '/trades', icon: Activity },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'System Logs', href: '/logs', icon: Terminal },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-border px-6">
        <LineChart className="mr-2 h-6 w-6 text-primary" />
        <span className="font-mono text-lg font-bold tracking-tight text-primary">AlgoTrade<span className="text-foreground">Pro</span></span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-3">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">System Online</span>
            <span className="text-[10px] text-muted-foreground">v2.4.0-stable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
