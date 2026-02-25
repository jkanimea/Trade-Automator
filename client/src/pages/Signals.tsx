import { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getSignals, getChannelSignals } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

type Tab = "all" | "live" | "channel";
type OutcomeFilter = "ALL" | "WIN" | "LOSS" | "PENDING";

export default function Signals() {
  useWebSocket();
  const [tab, setTab] = useState<Tab>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("ALL");

  const { data: liveSignals = [], isLoading: loadingLive } = useQuery({
    queryKey: ["signals"],
    queryFn: getSignals,
  });

  const { data: channelSignals = [], isLoading: loadingChannel } = useQuery({
    queryKey: ["/api/channel-signals"],
    queryFn: () => getChannelSignals(),
  });

  const combined = useMemo(() => {
    const live = liveSignals.map((s: any) => ({
      id: `live-${s.id}`,
      source: "live" as const,
      sourceName: "Live Listener",
      symbol: s.symbol,
      direction: s.direction,
      entry: s.entry,
      stopLoss: s.stopLoss,
      takeProfits: s.takeProfits || [],
      status: s.status,
      outcome: s.status === "PENDING" ? "PENDING" : s.pnl && s.pnl > 0 ? "WIN" : s.pnl && s.pnl < 0 ? "LOSS" : "PENDING",
      pnl: s.pnl,
      date: new Date(s.timestamp),
    }));

    const channel = channelSignals.map((s: any) => ({
      id: `ch-${s.id}`,
      source: "channel" as const,
      sourceName: s.channelName,
      symbol: s.symbol,
      direction: s.direction,
      entry: s.entry,
      stopLoss: s.stopLoss,
      takeProfits: s.takeProfits || [],
      status: s.outcome,
      outcome: s.outcome,
      pnl: null,
      date: new Date(s.messageDate),
    }));

    let list: typeof live = [];
    if (tab === "all") list = [...live, ...channel];
    else if (tab === "live") list = live;
    else list = channel;

    if (outcomeFilter !== "ALL") {
      list = list.filter(s => s.outcome === outcomeFilter);
    }

    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    return list;
  }, [liveSignals, channelSignals, tab, outcomeFilter]);

  const isLoading = loadingLive || loadingChannel;

  const stats = useMemo(() => {
    const all = [...liveSignals.map((s: any) => ({ outcome: s.status === "PENDING" ? "PENDING" : s.pnl && s.pnl > 0 ? "WIN" : "LOSS" })),
                 ...channelSignals.map((s: any) => ({ outcome: s.outcome }))];
    return {
      total: all.length,
      wins: all.filter(s => s.outcome === "WIN").length,
      losses: all.filter(s => s.outcome === "LOSS").length,
      pending: all.filter(s => s.outcome === "PENDING").length,
    };
  }, [liveSignals, channelSignals]);

  const statusColor = (outcome: string) => {
    if (outcome === "WIN") return "bg-success/20 text-success border-success/50";
    if (outcome === "LOSS") return "bg-destructive/20 text-destructive border-destructive/50";
    return "bg-amber-500/20 text-amber-500 border-amber-500/50";
  };

  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Signals" />
        <main className="flex-1 overflow-y-auto p-6 space-y-4">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              {([["all", "All Signals"], ["live", "Live"], ["channel", "Channel History"]] as const).map(([key, label]) => (
                <Button
                  key={key}
                  variant={tab === key ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setTab(key)}
                  data-testid={`tab-${key}`}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex gap-1">
                {(["ALL", "WIN", "LOSS", "PENDING"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={outcomeFilter === f ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    onClick={() => setOutcomeFilter(f)}
                    data-testid={`filter-${f.toLowerCase()}`}
                  >
                    {f === "ALL" ? "All" : f}
                    {f === "ALL" && <span className="ml-1 text-muted-foreground">({stats.total})</span>}
                    {f === "WIN" && <span className="ml-1 text-success">({stats.wins})</span>}
                    {f === "LOSS" && <span className="ml-1 text-destructive">({stats.losses})</span>}
                    {f === "PENDING" && <span className="ml-1 text-amber-500">({stats.pending})</span>}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading signals...</div>
          ) : combined.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No signals found</div>
          ) : (
            <div className="space-y-3">
              {combined.map((signal) => (
                <Card key={signal.id} className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-colors" data-testid={`signal-card-${signal.id}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${
                          signal.direction === 'BUY'
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-destructive/10 border-destructive/30 text-destructive'
                        }`}>
                          {signal.direction === 'BUY'
                            ? <ArrowUpRight className="h-5 w-5" />
                            : <ArrowDownRight className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold font-mono tracking-tight" data-testid={`text-signal-symbol-${signal.id}`}>{signal.symbol}</h3>
                            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border">
                              {signal.direction}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                              {signal.sourceName}
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
                        <div className="flex gap-2 flex-wrap">
                          {signal.takeProfits.map((tp: number, idx: number) => (
                            <div key={idx} className="bg-background/50 border border-border px-3 py-1 rounded text-xs font-mono">
                              <span className="text-muted-foreground mr-2">TP{idx + 1}</span>
                              <span className="text-success">{tp}</span>
                            </div>
                          ))}
                        </div>

                        <div className="min-w-[100px] text-right flex flex-col items-end gap-1">
                          <Badge className={statusColor(signal.outcome)} data-testid={`badge-outcome-${signal.id}`}>
                            {signal.outcome}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {signal.date.toLocaleDateString()} {signal.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {signal.pnl != null && (
                            <span className={`text-xs font-mono ${signal.pnl > 0 ? 'text-success' : 'text-destructive'}`}>
                              {signal.pnl > 0 ? '+' : ''}{signal.pnl} USD
                            </span>
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
