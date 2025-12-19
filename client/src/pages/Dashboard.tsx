import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { performanceData } from "@/lib/mockData";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSignals, getTrades, getSystemLogs } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

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

  const activeSignals = signals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').slice(0, 3);
  const activeTrades = trades.slice(0, 5);
  const recentLogs = logs.slice(0, 5);

  // Calculate metrics
  const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const completedSignals = signals.filter(s => s.status === 'COMPLETED');
  const winRate = completedSignals.length > 0 
    ? (completedSignals.filter(s => (s.pnl || 0) > 0).length / completedSignals.length * 100).toFixed(1)
    : "0.0";

  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dashboard" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Metrics Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard 
              title="Total Profit" 
              value={`$${totalProfit.toFixed(2)}`} 
              change={totalProfit >= 0 ? `+${((totalProfit / 10000) * 100).toFixed(1)}%` : `${((totalProfit / 10000) * 100).toFixed(1)}%`}
              trend={totalProfit >= 0 ? "up" : "down"} 
              icon={<Zap className="h-4 w-4 text-primary" />} 
            />
            <MetricCard 
              title="Active Trades" 
              value={activeTrades.length.toString()} 
              change={activeTrades.length <= 3 ? "Low Exposure" : "High Exposure"} 
              trend="neutral"
              icon={<Clock className="h-4 w-4 text-warning" />} 
            />
            <MetricCard 
              title="Win Rate" 
              value={`${winRate}%`} 
              change={completedSignals.length > 0 ? `${completedSignals.length} trades` : "No data"} 
              trend="up"
              icon={<ArrowUpRight className="h-4 w-4 text-success" />} 
            />
            <MetricCard 
              title="Risk Level" 
              value="Low" 
              change="2% Max Drawdown" 
              trend="up"
              icon={<ShieldCheck className="h-4 w-4 text-success" />} 
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 h-[400px]">
            {/* Chart */}
            <Card className="col-span-2 bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
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

            {/* Live Signals */}
            <Card className="col-span-1 bg-card/50 backdrop-blur-sm border-border flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  Latest Signals
                  <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {activeSignals.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No active signals
                  </div>
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
                        <div className="text-xs text-muted-foreground font-mono">
                          EP: {signal.entry}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{new Date(signal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <span className={`text-[10px] ${
                          signal.status === 'ACTIVE' ? 'text-success' : 'text-muted-foreground'
                        }`}>
                          {signal.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
             {/* Active Trades */}
             <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeTrades.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No active trades
                    </div>
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

             {/* System Logs */}
             <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">System Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 font-mono text-xs">
                  {recentLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No logs available
                    </div>
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
