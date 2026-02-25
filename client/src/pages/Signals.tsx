import { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getSignals, getChannelSignals } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

type OutcomeFilter = "ALL" | "WIN" | "LOSS" | "PENDING";

interface NormalizedSignal {
  id: string;
  source: "live" | "channel";
  channelId: string;
  channelName: string;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number;
  takeProfits: number[];
  outcome: string;
  pnl: number | null;
  date: Date;
}

export default function Signals() {
  useWebSocket();
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("ALL");
  const [collapsedChannels, setCollapsedChannels] = useState<Record<string, boolean>>({});

  const { data: liveSignals = [], isLoading: loadingLive } = useQuery({
    queryKey: ["signals"],
    queryFn: getSignals,
  });

  const { data: channelSignals = [], isLoading: loadingChannel } = useQuery({
    queryKey: ["/api/channel-signals"],
    queryFn: () => getChannelSignals(),
  });

  const allSignals: NormalizedSignal[] = useMemo(() => {
    const live = liveSignals.map((s: any) => ({
      id: `live-${s.id}`,
      source: "live" as const,
      channelId: "_live",
      channelName: "Live Listener",
      symbol: s.symbol,
      direction: s.direction,
      entry: s.entry,
      stopLoss: s.stopLoss,
      takeProfits: s.takeProfits || [],
      outcome: s.status === "PENDING" ? "PENDING" : s.pnl && s.pnl > 0 ? "WIN" : s.pnl && s.pnl < 0 ? "LOSS" : "PENDING",
      pnl: s.pnl,
      date: new Date(s.timestamp),
    }));

    const channel = channelSignals.map((s: any) => ({
      id: `ch-${s.id}`,
      source: "channel" as const,
      channelId: s.channelId,
      channelName: s.channelName,
      symbol: s.symbol,
      direction: s.direction,
      entry: s.entry,
      stopLoss: s.stopLoss,
      takeProfits: s.takeProfits || [],
      outcome: s.outcome,
      pnl: null,
      date: new Date(s.messageDate),
    }));

    let list = [...live, ...channel];
    if (outcomeFilter !== "ALL") {
      list = list.filter(s => s.outcome === outcomeFilter);
    }
    return list;
  }, [liveSignals, channelSignals, outcomeFilter]);

  const channelGroups = useMemo(() => {
    const groups: Record<string, { channelId: string; channelName: string; signals: NormalizedSignal[]; wins: number; losses: number; pending: number }> = {};

    for (const sig of allSignals) {
      if (!groups[sig.channelId]) {
        groups[sig.channelId] = { channelId: sig.channelId, channelName: sig.channelName, signals: [], wins: 0, losses: 0, pending: 0 };
      }
      groups[sig.channelId].signals.push(sig);
      if (sig.outcome === "WIN") groups[sig.channelId].wins++;
      else if (sig.outcome === "LOSS") groups[sig.channelId].losses++;
      else groups[sig.channelId].pending++;
    }

    for (const g of Object.values(groups)) {
      g.signals.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    return Object.values(groups).sort((a, b) => b.signals.length - a.signals.length);
  }, [allSignals]);

  const stats = useMemo(() => {
    return {
      total: allSignals.length,
      wins: allSignals.filter(s => s.outcome === "WIN").length,
      losses: allSignals.filter(s => s.outcome === "LOSS").length,
      pending: allSignals.filter(s => s.outcome === "PENDING").length,
    };
  }, [allSignals]);

  const isLoading = loadingLive || loadingChannel;

  const toggleChannel = (channelId: string) => {
    setCollapsedChannels(prev => ({ ...prev, [channelId]: !prev[channelId] }));
  };

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
            <p className="text-sm text-muted-foreground">
              {channelGroups.length} channel{channelGroups.length !== 1 ? 's' : ''} · {stats.total} signal{stats.total !== 1 ? 's' : ''}
            </p>
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
          ) : channelGroups.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No signals found</div>
          ) : (
            <div className="space-y-5">
              {channelGroups.map((group) => {
                const decided = group.wins + group.losses;
                const winRate = decided > 0 ? (group.wins / decided) * 100 : 0;
                const isCollapsed = collapsedChannels[group.channelId] ?? false;

                return (
                  <Card key={group.channelId} className="bg-card/50 backdrop-blur-sm border-border overflow-hidden" data-testid={`channel-group-${group.channelId}`}>
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/30 transition-colors py-4"
                      onClick={() => toggleChannel(group.channelId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isCollapsed
                            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          <div>
                            <CardTitle className="text-base">{group.channelName}</CardTitle>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{group.channelId !== "_live" ? group.channelId : "Real-time signals"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2 text-xs font-mono">
                            <span className="text-success">{group.wins}W</span>
                            <span className="text-destructive">{group.losses}L</span>
                            <span className="text-muted-foreground">{group.pending}P</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div className="h-full flex">
                                {decided > 0 && (
                                  <>
                                    <div className="h-full" style={{ width: `${winRate}%`, backgroundColor: '#22c55e' }} />
                                    <div className="h-full" style={{ width: `${100 - winRate}%`, backgroundColor: '#ef4444' }} />
                                  </>
                                )}
                              </div>
                            </div>
                            <span
                              className="text-sm font-bold font-mono min-w-[50px] text-right"
                              style={{ color: winRate >= 50 ? '#22c55e' : decided > 0 ? '#ef4444' : '#6b7280' }}
                            >
                              {decided > 0 ? `${winRate.toFixed(0)}%` : '—'}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {group.signals.length}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    {!isCollapsed && (
                      <CardContent className="pt-0 pb-4 px-4">
                        <div className="space-y-2">
                          {group.signals.map((signal) => (
                            <div
                              key={signal.id}
                              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background/30 hover:bg-background/50 transition-colors"
                              data-testid={`signal-card-${signal.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 ${
                                  signal.direction === 'BUY'
                                    ? 'bg-success/10 border-success/30 text-success'
                                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                                }`}>
                                  {signal.direction === 'BUY'
                                    ? <ArrowUpRight className="h-4 w-4" />
                                    : <ArrowDownRight className="h-4 w-4" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold font-mono text-sm" data-testid={`text-signal-symbol-${signal.id}`}>{signal.symbol}</span>
                                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border h-5">
                                      {signal.direction}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-0.5">
                                    <span>Entry: <span className="text-foreground">{signal.entry}</span></span>
                                    <ArrowRight className="h-2.5 w-2.5" />
                                    <span>SL: <span className="text-destructive">{signal.stopLoss}</span></span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="flex gap-1.5 flex-wrap">
                                  {signal.takeProfits.map((tp: number, idx: number) => (
                                    <div key={idx} className="bg-background/50 border border-border px-2 py-0.5 rounded text-[11px] font-mono">
                                      <span className="text-muted-foreground mr-1">TP{idx + 1}</span>
                                      <span className="text-success">{tp}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex flex-col items-end gap-0.5 min-w-[70px]">
                                  <Badge className={`text-[10px] ${statusColor(signal.outcome)}`} data-testid={`badge-outcome-${signal.id}`}>
                                    {signal.outcome}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {signal.date.toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
