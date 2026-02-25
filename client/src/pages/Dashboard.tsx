import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSignals, getTrades, getSystemLogs, getChannelSignals } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { performanceData } from "@/lib/mockData";

const COLORS = {
  WIN: "#22c55e",
  LOSS: "#ef4444",
  PENDING: "#6b7280",
};

export default function Dashboard() {
  useWebSocket();

  const { data: signals = [] } = useQuery({
    queryKey: ["signals"],
    queryFn: getSignals,
  });

  const { data: trades = [] } = useQuery({
    queryKey: ["activeTrades"],
    queryFn: () => getTrades(true),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => getSystemLogs(5),
  });

  const { data: channelSignals = [] } = useQuery({
    queryKey: ["/api/channel-signals"],
    queryFn: () => getChannelSignals(),
  });

  const activeSignals = signals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').slice(0, 3);
  const activeTrades = trades.slice(0, 5);
  const recentLogs = logs.slice(0, 5);

  const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const completedSignals = signals.filter(s => s.status === 'COMPLETED');
  const winRate = completedSignals.length > 0
    ? (completedSignals.filter(s => (s.pnl || 0) > 0).length / completedSignals.length * 100).toFixed(1)
    : "0.0";

  const channelStats = useMemo(() => {
    const grouped: Record<string, { name: string; signals: any[] }> = {};
    for (const sig of channelSignals) {
      const key = sig.channelId as string;
      if (!grouped[key]) {
        grouped[key] = { name: sig.channelName as string, signals: [] };
      }
      grouped[key].signals.push(sig);
    }

    return Object.entries(grouped).map(([id, group]) => {
      const total = group.signals.length;
      const wins = group.signals.filter((s: any) => s.outcome === "WIN").length;
      const losses = group.signals.filter((s: any) => s.outcome === "LOSS").length;
      const pending = group.signals.filter((s: any) => s.outcome === "PENDING").length;
      const decided = wins + losses;
      const winRate = decided > 0 ? (wins / decided) * 100 : 0;
      const lossRate = decided > 0 ? (losses / decided) * 100 : 0;
      return { id, name: group.name, total, wins, losses, pending, decided, winRate, lossRate };
    });
  }, [channelSignals]);

  const barData = useMemo(() => {
    return channelStats.map(ch => ({
      name: ch.name.length > 18 ? ch.name.slice(0, 18) + "…" : ch.name,
      "Win %": parseFloat(ch.winRate.toFixed(1)),
      "Loss %": parseFloat(ch.lossRate.toFixed(1)),
      total: ch.total,
    }));
  }, [channelStats]);

  const overallChannelStats = useMemo(() => {
    const total = channelSignals.length;
    const wins = channelSignals.filter((s: any) => s.outcome === "WIN").length;
    const losses = channelSignals.filter((s: any) => s.outcome === "LOSS").length;
    const pending = channelSignals.filter((s: any) => s.outcome === "PENDING").length;
    const decided = wins + losses;
    const winRate = decided > 0 ? (wins / decided) * 100 : 0;
    return { total, wins, losses, pending, decided, winRate };
  }, [channelSignals]);

  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dashboard" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Profit"
              value={`$${totalProfit.toFixed(2)}`}
              change={totalProfit >= 0 ? `+${((totalProfit / 10000) * 100).toFixed(1)}%` : `${((totalProfit / 10000) * 100).toFixed(1)}%`}
              trend={totalProfit >= 0 ? "up" : "down"}
              icon={<Zap className="h-4 w-4 text-primary" />}
            />
            <MetricCard
              title="Channel Signals"
              value={overallChannelStats.total.toString()}
              change={`${overallChannelStats.winRate.toFixed(1)}% Win Rate`}
              trend={overallChannelStats.winRate >= 50 ? "up" : "down"}
              icon={<ArrowUpRight className="h-4 w-4 text-success" />}
            />
            <MetricCard
              title="Active Trades"
              value={activeTrades.length.toString()}
              change={activeTrades.length <= 3 ? "Low Exposure" : "High Exposure"}
              trend="neutral"
              icon={<Clock className="h-4 w-4 text-warning" />}
            />
            <MetricCard
              title="Risk Level"
              value="Low"
              change="2% Max Drawdown"
              trend="up"
              icon={<ShieldCheck className="h-4 w-4 text-success" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="col-span-2 bg-card/50 backdrop-blur-sm border-border" data-testid="card-channel-win-rate">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Channel Win Rate Comparison</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {barData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No channel data — run the history scanner first
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                      <Legend />
                      <Bar dataKey="Win %" fill={COLORS.WIN} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Loss %" fill={COLORS.LOSS} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1 bg-card/50 backdrop-blur-sm border-border" data-testid="card-overall-pie">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Signal Outcomes</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {overallChannelStats.total === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Wins", value: overallChannelStats.wins },
                          { name: "Losses", value: overallChannelStats.losses },
                          { name: "Pending", value: overallChannelStats.pending },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill={COLORS.WIN} />
                        <Cell fill={COLORS.LOSS} />
                        <Cell fill={COLORS.PENDING} />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {channelStats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channelStats.map((ch) => (
                <Card key={ch.id} className="bg-card/50 backdrop-blur-sm border-border" data-testid={`card-channel-stat-${ch.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate">{ch.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{ch.total} signals</p>
                      </div>
                      <span
                        className="text-lg font-bold font-mono ml-2"
                        style={{ color: ch.winRate >= 50 ? COLORS.WIN : ch.decided > 0 ? COLORS.LOSS : COLORS.PENDING }}
                      >
                        {ch.decided > 0 ? `${ch.winRate.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div className="h-full flex">
                        {ch.decided > 0 && (
                          <>
                            <div
                              className="h-full transition-all"
                              style={{ width: `${ch.winRate}%`, backgroundColor: COLORS.WIN }}
                            />
                            <div
                              className="h-full transition-all"
                              style={{ width: `${ch.lossRate}%`, backgroundColor: COLORS.LOSS }}
                            />
                          </>
                        )}
                        {ch.pending > 0 && (
                          <div
                            className="h-full transition-all"
                            style={{ width: `${(ch.pending / ch.total) * 100}%`, backgroundColor: COLORS.PENDING }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-[11px] font-mono">
                      <span style={{ color: COLORS.WIN }}>{ch.wins}W</span>
                      <span style={{ color: COLORS.LOSS }}>{ch.losses}L</span>
                      <span style={{ color: COLORS.PENDING }}>{ch.pending}P</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="col-span-2 bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                    />
                    <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-1 bg-card/50 backdrop-blur-sm border-border flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  Latest Signals
                  <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {activeSignals.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">No active signals</div>
                ) : (
                  activeSignals.map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50 hover:bg-accent/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{signal.symbol}</span>
                          <Badge variant={signal.direction === 'BUY' ? 'default' : 'destructive'} className="text-[10px] h-5">
                            {signal.direction}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">EP: {signal.entry}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{new Date(signal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <span className={`text-[10px] ${signal.status === 'ACTIVE' ? 'text-success' : 'text-muted-foreground'}`}>{signal.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeTrades.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">No active trades</div>
                  ) : (
                    activeTrades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${trade.direction === 'BUY' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                            {trade.direction === 'BUY' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-mono font-bold">{trade.symbol}</p>
                            <p className="text-xs text-muted-foreground font-mono">{trade.volume} lots @ {trade.entryPrice}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-bold ${trade.profit > 0 ? 'text-success success-glow' : 'text-destructive'}`}>
                            {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">USD</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">System Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 font-mono text-xs">
                  {recentLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">No logs available</div>
                  ) : (
                    recentLogs.map((log, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-muted-foreground opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={
                          log.level === 'INFO' ? 'text-blue-400' :
                          log.level === 'SUCCESS' ? 'text-green-400' :
                          log.level === 'WARNING' ? 'text-yellow-400' : 'text-red-400'
                        }>{log.level}</span>
                        <span className="text-foreground/80">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, trend, icon }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="text-2xl font-bold font-mono text-glow">{value}</div>
          <p className={`text-xs ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {change}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
