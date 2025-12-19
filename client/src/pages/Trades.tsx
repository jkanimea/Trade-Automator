import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getTrades } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function Trades() {
  useWebSocket();
  
  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["activeTrades"],
    queryFn: () => getTrades(true),
  });

  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Active Positions" />
        <main className="flex-1 overflow-y-auto p-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Open Trades</CardTitle>
              <div className="flex gap-2">
                 <Button variant="destructive" size="sm">Close All</Button>
                 <Button variant="secondary" size="sm">Hedge All</Button>
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
                      <tr key={trade.id} className="border-b border-border transition-colors hover:bg-muted/50">
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
                          <Button variant="ghost" size="icon" className="h-8 w-8">
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
        </main>
      </div>
    </div>
  );
}
