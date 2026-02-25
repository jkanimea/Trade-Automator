import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getTrades, getChannelSignals, getSignals } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMemo } from "react";

export default function Trades() {
  useWebSocket();
  
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
    return channelSignals.filter((s: any) => s.outcome === "PENDING");
  }, [channelSignals]);

  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Active Positions" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Open Trades</CardTitle>
              <div className="flex gap-2">
                 <Button variant="destructive" size="sm" data-testid="button-close-all">Close All</Button>
                 <Button variant="secondary" size="sm" data-testid="button-hedge-all">Hedge All</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading trades...</div>
              ) : trades.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No active trades</div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
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
                <Radio className="h-5 w-5 text-primary" />
                <CardTitle>Live Signals</CardTitle>
                {pendingLiveSignals.length > 0 && (
                  <Badge variant="outline" className="ml-2">{pendingLiveSignals.length} active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Signals received from Telegram channels awaiting execution</p>
            </CardHeader>
            <CardContent>
              {loadingLiveSignals ? (
                <div className="text-center text-muted-foreground py-6">Loading signals...</div>
              ) : pendingLiveSignals.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">No pending live signals</div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b border-border">
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Symbol</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Direction</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Entry</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">SL</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">TP1</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">TP2</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">TP3</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {pendingLiveSignals.map((sig: any) => (
                        <tr key={sig.id} className="border-b border-border transition-colors hover:bg-muted/50" data-testid={`row-live-signal-${sig.id}`}>
                          <td className="p-4 align-middle font-mono font-bold">{sig.symbol}</td>
                          <td className="p-4 align-middle">
                            <Badge variant={sig.direction === 'BUY' ? 'default' : 'destructive'} className="flex items-center gap-1 w-fit">
                              {sig.direction === 'BUY' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {sig.direction}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle text-right font-mono">{sig.entry}</td>
                          <td className="p-4 align-middle text-right font-mono text-destructive">{sig.stopLoss}</td>
                          <td className="p-4 align-middle text-right font-mono text-success">{sig.takeProfits?.[0] ?? '—'}</td>
                          <td className="p-4 align-middle text-right font-mono text-success">{sig.takeProfits?.[1] ?? '—'}</td>
                          <td className="p-4 align-middle text-right font-mono text-success">{sig.takeProfits?.[2] ?? '—'}</td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-xs text-amber-500 font-medium">PENDING</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle text-xs text-muted-foreground">
                            {new Date(sig.timestamp).toLocaleString()}
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
                <Radio className="h-5 w-5 text-amber-500" />
                <CardTitle>Channel Signals — Pending</CardTitle>
                {pendingChannelSignals.length > 0 && (
                  <Badge variant="outline" className="ml-2">{pendingChannelSignals.length} pending</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Historical signals from channels that haven't resolved (no TP or SL confirmation found)</p>
            </CardHeader>
            <CardContent>
              {loadingChannelSignals ? (
                <div className="text-center text-muted-foreground py-6">Loading...</div>
              ) : pendingChannelSignals.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">No pending channel signals</div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b border-border">
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Channel</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Symbol</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Direction</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Entry</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">SL</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">TP1</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">TP2</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">TP3</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {pendingChannelSignals.map((sig: any) => (
                        <tr key={sig.id} className="border-b border-border transition-colors hover:bg-muted/50" data-testid={`row-channel-signal-${sig.id}`}>
                          <td className="p-4 align-middle text-xs text-muted-foreground max-w-[120px] truncate">{sig.channelName}</td>
                          <td className="p-4 align-middle font-mono font-bold">{sig.symbol}</td>
                          <td className="p-4 align-middle">
                            <Badge variant={sig.direction === 'BUY' ? 'default' : 'destructive'} className="flex items-center gap-1 w-fit">
                              {sig.direction === 'BUY' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {sig.direction}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle text-right font-mono">{sig.entry}</td>
                          <td className="p-4 align-middle text-right font-mono text-destructive">{sig.stopLoss}</td>
                          <td className="p-4 align-middle text-right font-mono text-success">{sig.takeProfits?.[0] ?? '—'}</td>
                          <td className="p-4 align-middle text-right font-mono text-success">{sig.takeProfits?.[1] ?? '—'}</td>
                          <td className="p-4 align-middle text-right font-mono text-success">{sig.takeProfits?.[2] ?? '—'}</td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-xs text-amber-500 font-medium">PENDING</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle text-xs text-muted-foreground">
                            {new Date(sig.messageDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
