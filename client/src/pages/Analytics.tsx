import { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getChannelSignals, getSettings } from "@/lib/api";
import { Loader2, BarChart3, TrendingUp, TrendingDown, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

const COLORS = {
  WIN: "#22c55e",
  LOSS: "#ef4444",
  PENDING: "#6b7280",
};

export default function Analytics() {
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");

  const { data: signalsData = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/channel-signals"],
    queryFn: () => getChannelSignals(),
    refetchInterval: scanning ? 3000 : false,
  });

  const { data: settingsData = [] } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: getSettings,
  });

  const channels = useMemo(() => {
    const channelsSetting = settingsData.find((s: any) => s.key === "telegram_channels");
    if (!channelsSetting) return [];
    try {
      return JSON.parse(channelsSetting.value);
    } catch {
      return [];
    }
  }, [settingsData]);

  const channelStats = useMemo(() => {
    const grouped: Record<string, { channelId: string; channelName: string; signals: any[] }> = {};

    for (const sig of signalsData) {
      if (!grouped[sig.channelId]) {
        grouped[sig.channelId] = { channelId: sig.channelId, channelName: sig.channelName, signals: [] };
      }
      grouped[sig.channelId].signals.push(sig);
    }

    return Object.values(grouped).map(group => {
      const total = group.signals.length;
      const wins = group.signals.filter((s: any) => s.outcome === "WIN").length;
      const losses = group.signals.filter((s: any) => s.outcome === "LOSS").length;
      const pending = group.signals.filter((s: any) => s.outcome === "PENDING").length;
      const decided = wins + losses;
      const winRate = decided > 0 ? (wins / decided) * 100 : 0;

      const symbolBreakdown: Record<string, { wins: number; losses: number; pending: number }> = {};
      for (const sig of group.signals) {
        if (!symbolBreakdown[sig.symbol]) {
          symbolBreakdown[sig.symbol] = { wins: 0, losses: 0, pending: 0 };
        }
        if (sig.outcome === "WIN") symbolBreakdown[sig.symbol].wins++;
        else if (sig.outcome === "LOSS") symbolBreakdown[sig.symbol].losses++;
        else symbolBreakdown[sig.symbol].pending++;
      }

      return {
        ...group,
        total,
        wins,
        losses,
        pending,
        decided,
        winRate,
        symbolBreakdown,
      };
    });
  }, [signalsData]);

  const overallStats = useMemo(() => {
    const total = signalsData.length;
    const wins = signalsData.filter((s: any) => s.outcome === "WIN").length;
    const losses = signalsData.filter((s: any) => s.outcome === "LOSS").length;
    const pending = signalsData.filter((s: any) => s.outcome === "PENDING").length;
    const decided = wins + losses;
    const winRate = decided > 0 ? (wins / decided) * 100 : 0;
    return { total, wins, losses, pending, decided, winRate };
  }, [signalsData]);

  const handleScan = async () => {
    setScanning(true);
    setScanStatus("Starting scan...");
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "INFO", message: "History Fetch: Triggered from dashboard" }),
      });

      setScanStatus("Scan triggered — the Python script will fetch and analyze channel history. Check System Logs for progress.");
      setTimeout(() => {
        refetch();
        setScanning(false);
        setScanStatus("Scan complete — data refreshed.");
      }, 5000);
    } catch (error) {
      setScanStatus("Failed to trigger scan");
      setScanning(false);
    }
  };

  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight" data-testid="text-analytics-title">
                Channel Analytics
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Signal success & failure rates across your monitored channels
              </p>
            </div>
            <Button
              onClick={() => { refetch(); }}
              variant="outline"
              size="sm"
              disabled={isLoading}
              data-testid="button-refresh-analytics"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {scanStatus && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-md p-3 border border-border">
              {scanStatus}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : signalsData.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Signal Data Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Run the history scanner to fetch and analyze past signals from your Telegram channels.
                </p>
                <p className="text-xs text-muted-foreground font-mono mb-4">
                  Run: python python/fetch_history.py
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card data-testid="card-total-signals">
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Total Signals</div>
                    <div className="text-3xl font-bold font-mono mt-1">{overallStats.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">Across {channelStats.length} channel(s)</div>
                  </CardContent>
                </Card>
                <Card data-testid="card-win-rate">
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Overall Win Rate</div>
                    <div className="text-3xl font-bold font-mono mt-1" style={{ color: overallStats.winRate >= 50 ? COLORS.WIN : COLORS.LOSS }}>
                      {overallStats.winRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{overallStats.decided} decided signals</div>
                  </CardContent>
                </Card>
                <Card data-testid="card-wins">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ArrowUpRight className="h-3.5 w-3.5" style={{ color: COLORS.WIN }} />
                      Wins
                    </div>
                    <div className="text-3xl font-bold font-mono mt-1" style={{ color: COLORS.WIN }}>{overallStats.wins}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {overallStats.total > 0 ? ((overallStats.wins / overallStats.total) * 100).toFixed(1) : 0}% of total
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-losses">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ArrowDownRight className="h-3.5 w-3.5" style={{ color: COLORS.LOSS }} />
                      Losses
                    </div>
                    <div className="text-3xl font-bold font-mono mt-1" style={{ color: COLORS.LOSS }}>{overallStats.losses}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {overallStats.total > 0 ? ((overallStats.losses / overallStats.total) * 100).toFixed(1) : 0}% of total
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid="card-overall-pie">
                  <CardHeader>
                    <CardTitle className="text-base">Overall Outcome Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Wins", value: overallStats.wins },
                              { name: "Losses", value: overallStats.losses },
                              { name: "Pending", value: overallStats.pending },
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill={COLORS.WIN} />
                            <Cell fill={COLORS.LOSS} />
                            <Cell fill={COLORS.PENDING} />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-channel-comparison">
                  <CardHeader>
                    <CardTitle className="text-base">Channel Win Rate Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={channelStats.map(ch => ({
                          name: ch.channelName.length > 15 ? ch.channelName.slice(0, 15) + "…" : ch.channelName,
                          "Win %": parseFloat(ch.winRate.toFixed(1)),
                          "Loss %": ch.decided > 0 ? parseFloat(((ch.losses / ch.decided) * 100).toFixed(1)) : 0,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#999' }} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Legend />
                          <Bar dataKey="Win %" fill={COLORS.WIN} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Loss %" fill={COLORS.LOSS} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {channelStats.map((ch) => (
                <Card key={ch.channelId} data-testid={`card-channel-${ch.channelId}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{ch.channelName}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono mt-1">{ch.channelId}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-mono font-bold" style={{ color: ch.winRate >= 50 ? COLORS.WIN : COLORS.LOSS }}>
                          {ch.winRate.toFixed(1)}% Win Rate
                        </span>
                        <span className="text-muted-foreground">
                          {ch.total} signals
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Wins", value: ch.wins },
                                { name: "Losses", value: ch.losses },
                                { name: "Pending", value: ch.pending },
                              ].filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              <Cell fill={COLORS.WIN} />
                              <Cell fill={COLORS.LOSS} />
                              <Cell fill={COLORS.PENDING} />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground mb-2">By Symbol</div>
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                          {Object.entries(ch.symbolBreakdown)
                            .sort(([, a], [, b]) => (b.wins + b.losses + b.pending) - (a.wins + a.losses + a.pending))
                            .map(([symbol, stats]) => {
                              const decided = stats.wins + stats.losses;
                              const wr = decided > 0 ? (stats.wins / decided) * 100 : 0;
                              return (
                                <div key={symbol} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background/50">
                                  <span className="font-mono font-medium">{symbol}</span>
                                  <div className="flex items-center gap-3">
                                    <span style={{ color: COLORS.WIN }} className="font-mono text-xs">{stats.wins}W</span>
                                    <span style={{ color: COLORS.LOSS }} className="font-mono text-xs">{stats.losses}L</span>
                                    {stats.pending > 0 && <span style={{ color: COLORS.PENDING }} className="font-mono text-xs">{stats.pending}P</span>}
                                    <span className="font-mono text-xs" style={{ color: wr >= 50 ? COLORS.WIN : decided > 0 ? COLORS.LOSS : COLORS.PENDING }}>
                                      {decided > 0 ? `${wr.toFixed(0)}%` : '—'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex gap-4">
                          <span>Total: <span className="font-mono font-medium text-foreground">{ch.total}</span></span>
                          <span>Decided: <span className="font-mono font-medium text-foreground">{ch.decided}</span></span>
                        </div>
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.WIN }} />
                            {ch.wins} wins
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.LOSS }} />
                            {ch.losses} losses
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.PENDING }} />
                            {ch.pending} pending
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
