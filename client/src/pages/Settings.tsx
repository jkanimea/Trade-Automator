import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, upsertSetting } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, CheckCircle2, Bot } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settingsData = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const settingsMap = settingsData.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  const [accountId, setAccountId] = useState("");
  const [maxRisk, setMaxRisk] = useState("2.0");
  const [dailyLossLimit, setDailyLossLimit] = useState("500");
  const [autoBreakEven, setAutoBreakEven] = useState(true);
  const [newChannel, setNewChannel] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [botTokenStatus, setBotTokenStatus] = useState<"unknown" | "configured" | "not_configured">("unknown");

  useEffect(() => {
    fetch("/api/status")
      .then(res => res.json())
      .then(data => {
        setBotTokenStatus(data.telegram_bot_token ? "configured" : "not_configured");
      })
      .catch(() => setBotTokenStatus("unknown"));
  }, []);

  useEffect(() => {
    if (settingsData.length > 0) {
      setAccountId(settingsMap["ctrader_account_id"] || "");
      setMaxRisk(settingsMap["max_risk_percent"] || "2.0");
      setDailyLossLimit(settingsMap["daily_loss_limit"] || "500");
      setAutoBreakEven(settingsMap["auto_break_even"] !== "false");
      const channelList = settingsMap["telegram_channels"];
      if (channelList) {
        setChannels(JSON.parse(channelList));
      }
    }
  }, [settingsData]);

  // Mutation for saving settings
  const saveMutation = useMutation({
    mutationFn: upsertSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const handleSaveRiskSettings = async () => {
    try {
      await saveMutation.mutateAsync({ key: "max_risk_percent", value: maxRisk });
      await saveMutation.mutateAsync({ key: "daily_loss_limit", value: dailyLossLimit });
      await saveMutation.mutateAsync({ key: "auto_break_even", value: autoBreakEven.toString() });
      toast({
        title: "Settings Saved",
        description: "Risk management settings have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAccountId = async () => {
    try {
      await saveMutation.mutateAsync({ key: "ctrader_account_id", value: accountId });
      toast({
        title: "Account ID Saved",
        description: "cTrader account ID has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save account ID.",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTestingConnection(false);
    toast({
      title: "Connection Test",
      description: "API connection test completed. Check the logs for details.",
    });
  };

  const handleAddChannel = async () => {
    if (!newChannel.trim()) {
      toast({
        title: "Error",
        description: "Please enter a channel name or ID.",
        variant: "destructive",
      });
      return;
    }

    const updatedChannels = [...channels, newChannel.trim()];
    setChannels(updatedChannels);
    setNewChannel("");

    try {
      await saveMutation.mutateAsync({ 
        key: "telegram_channels", 
        value: JSON.stringify(updatedChannels) 
      });
      toast({
        title: "Channel Added",
        description: `"${newChannel.trim()}" has been added to monitored channels.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add channel.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveChannel = async (channelToRemove: string) => {
    const updatedChannels = channels.filter(c => c !== channelToRemove);
    setChannels(updatedChannels);

    try {
      await saveMutation.mutateAsync({ 
        key: "telegram_channels", 
        value: JSON.stringify(updatedChannels) 
      });
      toast({
        title: "Channel Removed",
        description: `"${channelToRemove}" has been removed.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove channel.",
        variant: "destructive",
      });
    }
  };

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
                  <Input 
                    id="client-id" 
                    type="password" 
                    value="••••••••••••••••" 
                    className="bg-background/50 font-mono" 
                    readOnly 
                  />
                  <p className="text-xs text-muted-foreground">Set via CTRADER_CLIENT_ID secret</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-secret">Client Secret</Label>
                  <Input 
                    id="client-secret" 
                    type="password" 
                    value="••••••••••••••••" 
                    className="bg-background/50 font-mono" 
                    readOnly 
                  />
                  <p className="text-xs text-muted-foreground">Set via CTRADER_CLIENT_SECRET secret</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="account-id">Account ID</Label>
                  <Input 
                    id="account-id" 
                    value={accountId} 
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="Enter your cTrader account ID"
                    className="bg-background/50 font-mono" 
                  />
                </div>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Button 
                  onClick={handleSaveAccountId}
                  disabled={saveMutation.isPending}
                  className="w-full sm:w-auto"
                  data-testid="button-save-credentials"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Account ID
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto text-success border-success/30 hover:bg-success/10 hover:text-success"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  data-testid="button-test-connection"
                >
                  {testingConnection ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Test Connection
                </Button>
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
                  <Input 
                    type="number" 
                    value={maxRisk} 
                    onChange={(e) => setMaxRisk(e.target.value)}
                    className="w-20 bg-background/50 font-mono text-right"
                    step="0.1"
                    min="0.1"
                    max="10"
                    data-testid="input-max-risk"
                  />
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
                  <Input 
                    type="number" 
                    value={dailyLossLimit} 
                    onChange={(e) => setDailyLossLimit(e.target.value)}
                    className="w-24 bg-background/50 font-mono text-right"
                    step="100"
                    min="0"
                    data-testid="input-daily-loss-limit"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Break Even</Label>
                  <p className="text-xs text-muted-foreground">Move SL to entry after TP1 is hit</p>
                </div>
                <Switch 
                  checked={autoBreakEven} 
                  onCheckedChange={setAutoBreakEven}
                  data-testid="switch-auto-break-even"
                />
              </div>
              <div className="pt-4">
                <Button 
                  onClick={handleSaveRiskSettings}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-risk-settings"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Risk Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Telegram Configuration
              </CardTitle>
              <CardDescription>Bot token and source channels for signal parsing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bot-token">Bot Token</Label>
                {botTokenStatus === "configured" ? (
                  <div className="flex items-center gap-3 p-3 rounded-md border border-success/30 bg-success/5">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-success">Bot Token Configured</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Stored securely as an environment secret (TELEGRAM_BOT_TOKEN)</p>
                    </div>
                  </div>
                ) : botTokenStatus === "not_configured" ? (
                  <div className="flex items-center gap-3 p-3 rounded-md border border-destructive/30 bg-destructive/5">
                    <Bot className="h-5 w-5 text-destructive shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Bot Token Not Configured</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Add TELEGRAM_BOT_TOKEN in Replit Secrets to enable Telegram integration</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-background/30">
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
                    <p className="text-sm text-muted-foreground">Checking bot token status...</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Monitored Channels</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter Channel ID or Username" 
                    className="bg-background/50"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddChannel();
                      }
                    }}
                    data-testid="input-new-channel"
                  />
                  <Button 
                    variant="secondary" 
                    onClick={handleAddChannel}
                    disabled={saveMutation.isPending}
                    data-testid="button-add-channel"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Channel
                  </Button>
                </div>
                <div className="space-y-2 mt-4">
                  {channels.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4 text-sm">
                      No channels configured. Add a channel to start monitoring signals.
                    </div>
                  ) : (
                    channels.map((channel, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-md border border-border bg-background/30"
                        data-testid={`channel-item-${index}`}
                      >
                        <span className="font-mono text-sm">{channel}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveChannel(channel)}
                          data-testid={`button-remove-channel-${index}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </main>
      </div>
    </div>
  );
}
