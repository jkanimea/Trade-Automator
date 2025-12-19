import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSignals } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function Signals() {
  useWebSocket();
  
  const { data: signals = [], isLoading } = useQuery({
    queryKey: ["signals"],
    queryFn: getSignals,
  });

  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Signal History" />
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading signals...</div>
          ) : signals.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No signals yet</div>
          ) : (
            <div className="space-y-4">
              {signals.map((signal) => (
              <Card key={signal.id} className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${
                        signal.direction === 'BUY' 
                          ? 'bg-success/10 border-success/30 text-success' 
                          : 'bg-destructive/10 border-destructive/30 text-destructive'
                      }`}>
                        <span className="text-xs font-bold">{signal.direction}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold font-mono tracking-tight">{signal.symbol}</h3>
                          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border">
                            {new Date(signal.timestamp).toLocaleString()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground mt-1">
                          <span>Entry: <span className="text-foreground">{signal.entry}</span></span>
                          <ArrowRight className="h-3 w-3" />
                          <span>SL: <span className="text-destructive">{signal.stopLoss}</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                      <div className="flex gap-2">
                        {signal.takeProfits.map((tp, idx) => (
                          <div key={idx} className="bg-background/50 border border-border px-3 py-1 rounded text-xs font-mono">
                            <span className="text-muted-foreground mr-2">TP{idx+1}</span>
                            <span className="text-success">{tp}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="min-w-[100px] text-right">
                        <Badge className={`
                          ${signal.status === 'ACTIVE' ? 'bg-primary/20 text-primary border-primary/50 hover:bg-primary/30' : 
                            signal.status === 'COMPLETED' ? 'bg-success/20 text-success border-success/50 hover:bg-success/30' : 
                            'bg-muted text-muted-foreground'}
                        `}>
                          {signal.status}
                        </Badge>
                        {signal.pnl && (
                          <div className={`text-sm font-mono mt-1 ${signal.pnl > 0 ? 'text-success' : 'text-destructive'}`}>
                            {signal.pnl > 0 ? '+' : ''}{signal.pnl} USD
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
