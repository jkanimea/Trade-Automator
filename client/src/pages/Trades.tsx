import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, Radio, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTrades, getChannelSignals, getSignals } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";

export default function Trades() {
  useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(false);

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["activeTrades"],
    queryFn: () => getTrades(true),
  });

  const { data: channelSignals = [], isLoading: loadingChannelSignals } = useQuery({
    queryKey: ["/api/channel-signals"],
    queryFn: () => getChannelSignals(),
  });

  const { data: liveSignals = [], isLoading: loadingLiveSignals } = useQuery({
    queryKey: ["/api/signals"],
    queryFn: () => getSignals(),
  });

  const pendingLiveSignals = useMemo(() => {
    return liveSignals.filter((s: any) => s.status === "PENDING");
  }, [liveSignals]);

  const pendingChannelSignals = useMemo(() => {
    const pending = channelSignals.filter((s: any) => s.outcome === "PENDING");
    const grouped: Record<string, { channelName: string; signals: any[] }> = {};
    for (const sig of pending) {
      if (!grouped[sig.channelId]) {
        grouped[sig.channelId] = { channelName: sig.channelName, signals: [] };
      }
      grouped[sig.channelId].signals.push(sig);
    }
    return Object.entries(grouped);
  }, [channelSignals]);

  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Active Trades" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          <div className="flex items-center justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-3 text-success border-success/30 hover:bg-success/10 hover:text-success"
              disabled={verifying}
              onClick={async () => {
                setVerifying(true);
                try {
                  const resp = await fetch("/api/verify-signals", { method: "POST" });
                  const data = await resp.json();
                  if (data.error) {
                    toast({ title: "Verification Error", description: data.error, variant: "destructive" });
                  } else {
                    toast({ title: "Price Verification Started", description: "Checking signals against real market data. Results will update automatically." });
                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/channel-signals"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
                    }, 10000);
                  }
                } catch {
                  toast({ title: "Error", description: "Failed to start verification.", variant: "destructive" });
                } finally {
                  setVerifying(false);
                }
              }}
              data-testid="button-verify-prices-trades"
            >
              {verifying ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3 w-3" />}
              Verify Prices
            </Button>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Open Positions</CardTitle>
              <div className="flex gap-2">
                 <Button variant="destructive" size="sm" data-testid="button-close-all">Close All</Button>
                 <Button variant="secondary" size="sm" data-testid="button-hedge-all">Hedge All</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading trades...</div>
              ) : trades.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No open positions</div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b border-border">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Symbol</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ticket</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Volume</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Entry</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Current</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">SL</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">TP</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Profit</th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-border transition-colors hover:bg-muted/50" data-testid={`row-trade-${trade.id}`}>
                        <td className="p-4 align-middle font-mono font-bold">{trade.symbol}</td>
                        <td className="p-4 align-middle font-mono text-xs text-muted-foreground">#{trade.ticketId}</td>
                        <td className="p-4 align-middle">
                           <Badge variant={trade.direction === 'BUY' ? 'default' : 'destructive'}>
                             {trade.direction}
                           </Badge>
                        </td>
                        <td className="p-4 align-middle text-right font-mono">{trade.volume}</td>
                        <td className="p-4 align-middle text-right font-mono text-muted-foreground">{trade.entryPrice}</td>
                        <td className="p-4 align-middle text-right font-mono">{trade.currentPrice}</td>
                        <td className="p-4 align-middle text-right font-mono text-destructive">{trade.sl}</td>
                        <td className="p-4 align-middle text-right font-mono text-success">{trade.tp}</td>
                        <td className={`p-4 align-middle text-right font-mono font-bold ${trade.profit > 0 ? 'text-success' : 'text-destructive'}`}>
                          {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(2)}
                        </td>
                        <td className="p-4 align-middle text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-trade-action-${trade.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <CardTitle>Live Signals</CardTitle>
                {pendingLiveSignals.length > 0 && (
                  <Badge variant="outline" className="ml-2">{pendingLiveSignals.length} active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Signals just received — awaiting execution or outcome</p>
            </CardHeader>
            <CardContent>
              {loadingLiveSignals ? (
                <div className="text-center text-muted-foreground py-6">Loading...</div>
              ) : pendingLiveSignals.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">No live signals right now</div>
              ) : (
                <div className="space-y-2">
                  {pendingLiveSignals.map((sig: any) => (
                    <div key={sig.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background/30" data-testid={`row-live-signal-${sig.id}`}>
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 ${
                          sig.direction === 'BUY' ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'
                        }`}>
                          {sig.direction === 'BUY' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">{sig.symbol}</span>
                            <Badge variant="outline" className="text-[10px] font-mono h-5">{sig.direction}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-0.5">
                            <span>Entry: <span className="text-foreground">{sig.entry}</span></span>
                            <ArrowRight className="h-2.5 w-2.5" />
                            <span>SL: <span className="text-destructive">{sig.stopLoss}</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {sig.takeProfits?.map((tp: number, idx: number) => (
                            <div key={idx} className="bg-background/50 border border-border px-2 py-0.5 rounded text-[11px] font-mono">
                              <span className="text-muted-foreground mr-1">TP{idx + 1}</span>
                              <span className="text-success">{tp}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-xs text-amber-500 font-medium font-mono">LIVE</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(sig.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {pendingChannelSignals.length > 0 && pendingChannelSignals.map(([channelId, group]) => (
            <Card key={channelId} className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base">{group.channelName}</CardTitle>
                  <Badge variant="outline" className="ml-1 text-[10px]">{group.signals.length} pending</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Signals not yet resolved (no TP or SL confirmation)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.signals.map((sig: any) => (
                    <div key={sig.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background/30" data-testid={`row-channel-signal-${sig.id}`}>
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 ${
                          sig.direction === 'BUY' ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'
                        }`}>
                          {sig.direction === 'BUY' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">{sig.symbol}</span>
                            <Badge variant="outline" className="text-[10px] font-mono h-5">{sig.direction}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-0.5">
                            <span>Entry: <span className="text-foreground">{sig.entry}</span></span>
                            <ArrowRight className="h-2.5 w-2.5" />
                            <span>SL: <span className="text-destructive">{sig.stopLoss}</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {sig.takeProfits?.map((tp: number, idx: number) => (
                            <div key={idx} className="bg-background/50 border border-border px-2 py-0.5 rounded text-[11px] font-mono">
                              <span className="text-muted-foreground mr-1">TP{idx + 1}</span>
                              <span className="text-success">{tp}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-xs text-amber-500 font-medium font-mono">PENDING</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(sig.messageDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </main>
      </div>
    </div>
  );
}
