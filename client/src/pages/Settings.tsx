import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  return (
    <div className="flex h-screen bg-background trading-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="System Configuration" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
          
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Manage your cTrader Open API connection details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-id">Client ID</Label>
                  <Input id="client-id" type="password" value="••••••••••••••••" className="bg-background/50 font-mono" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-secret">Client Secret</Label>
                  <Input id="client-secret" type="password" value="••••••••••••••••" className="bg-background/50 font-mono" readOnly />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="account-id">Account ID</Label>
                  <Input id="account-id" value="23849102" className="bg-background/50 font-mono" />
                </div>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Button className="w-full sm:w-auto">Update Credentials</Button>
                <Button variant="outline" className="w-full sm:w-auto text-success border-success/30 hover:bg-success/10 hover:text-success">Test Connection</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
              <CardDescription>Safety limits and position sizing rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Max Risk Per Trade</Label>
                  <p className="text-xs text-muted-foreground">Percentage of account equity to risk per trade</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" value="2.0" className="w-20 bg-background/50 font-mono text-right" />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Loss Limit</Label>
                  <p className="text-xs text-muted-foreground">Stop trading if daily loss exceeds this amount</p>
                </div>
                 <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">$</span>
                  <Input type="number" value="500" className="w-24 bg-background/50 font-mono text-right" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Break Even</Label>
                  <p className="text-xs text-muted-foreground">Move SL to entry after TP1 is hit</p>
                </div>
                <Switch checked={true} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>Telegram Channels</CardTitle>
              <CardDescription>Configure source channels for signal parsing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="Enter Channel ID or Username" className="bg-background/50" />
                  <Button variant="secondary">Add Channel</Button>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between p-3 rounded-md border border-border bg-background/30">
                    <span className="font-mono text-sm">Forex VIP Signals</span>
                    <Button variant="ghost" size="sm" className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10">Remove</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md border border-border bg-background/30">
                    <span className="font-mono text-sm">Gold Scalper Pro</span>
                    <Button variant="ghost" size="sm" className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10">Remove</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </main>
      </div>
    </div>
  );
}
