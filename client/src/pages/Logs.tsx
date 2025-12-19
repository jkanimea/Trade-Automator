import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { getSystemLogs } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function Logs() {
  useWebSocket();
  
  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => getSystemLogs(50),
    refetchInterval: 2000,
  });

  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="System Logs" />
        <main className="flex-1 p-6 flex flex-col min-h-0">
          <div className="flex-1 bg-black/80 rounded-lg border border-border font-mono text-sm p-4 overflow-hidden flex flex-col shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <span className="text-muted-foreground text-xs">Terminal Output</span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {logs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No logs available
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-3 hover:bg-white/5 py-0.5 px-2 rounded">
                      <span className="text-muted-foreground opacity-50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={`shrink-0 w-16 ${
                        log.level === 'INFO' ? 'text-blue-400' :
                        log.level === 'SUCCESS' ? 'text-green-400' : 
                        log.level === 'WARNING' ? 'text-yellow-400' : 'text-red-400'
                      }`}>{log.level}</span>
                      <span className="text-foreground/90">{log.message}</span>
                    </div>
                  ))
                )}
                <div className="h-4 w-2 bg-primary animate-pulse mt-2 ml-2" />
              </div>
            </ScrollArea>
          </div>
        </main>
      </div>
    </div>
  );
}
