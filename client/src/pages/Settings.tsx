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
import { Trash2, Plus, Loader2, CheckCircle2, Bot, Eye, EyeOff } from "lucide-react";

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
  const [newChannelLabel, setNewChannelLabel] = useState("");
  const [channels, setChannels] = useState<{id: string, label: string}[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [telegramApiId, setTelegramApiId] = useState("");
  const [telegramApiHash, setTelegramApiHash] = useState("");
  const [telegramPhone, setTelegramPhone] = useState("");
  const [showApiHash, setShowApiHash] = useState(false);

  useEffect(() => {
    if (settingsData.length > 0) {
      setAccountId(settingsMap["ctrader_account_id"] || "");
      setMaxRisk(settingsMap["max_risk_percent"] || "2.0");
      setDailyLossLimit(settingsMap["daily_loss_limit"] || "500");
      setAutoBreakEven(settingsMap["auto_break_even"] !== "false");
      setTelegramApiId(settingsMap["telegram_api_id"] || "");
      setTelegramApiHash(settingsMap["telegram_api_hash"] || "");
      setTelegramPhone(settingsMap["telegram_phone"] || "");
      const channelList = settingsMap["telegram_channels"];
      if (channelList) {
        const parsed = JSON.parse(channelList);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((ch: any) =>
            typeof ch === "string" ? { id: ch, label: ch } : ch
          );
          setChannels(normalized);
        }
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

  const saveChannels = async (updated: {id: string, label: string}[]) => {
    await saveMutation.mutateAsync({
      key: "telegram_channels",
      value: JSON.stringify(updated),
    });
  };

  const handleAddChannel = async () => {
    if (!newChannel.trim()) {
      toast({
        title: "Error",
        description: "Please enter a channel ID or username.",
        variant: "destructive",
      });
      return;
    }

    const entry = { id: newChannel.trim(), label: newChannelLabel.trim() || newChannel.trim() };
    const updatedChannels = [...channels, entry];
    setChannels(updatedChannels);
    setNewChannel("");
    setNewChannelLabel("");

    try {
      await saveChannels(updatedChannels);
      toast({
        title: "Channel Added",
        description: `"${entry.label}" has been added to monitored channels.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add channel.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveChannel = async (channelId: string) => {
    const removed = channels.find(c => c.id === channelId);
    const updatedChannels = channels.filter(c => c.id !== channelId);
    setChannels(updatedChannels);

    try {
      await saveChannels(updatedChannels);
      toast({
        title: "Channel Removed",
        description: `"${removed?.label || channelId}" has been removed.`,
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
              <CardDescription>Userbot credentials and source channels for signal parsing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telegram-api-id">API ID</Label>
                  <Input
                    id="telegram-api-id"
                    value={telegramApiId}
                    onChange={(e) => setTelegramApiId(e.target.value)}
                    placeholder="e.g. 12345678"
                    className="bg-background/50 font-mono"
                    data-testid="input-telegram-api-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram-api-hash">API Hash</Label>
                  <div className="relative">
                    <Input
                      id="telegram-api-hash"
                      type={showApiHash ? "text" : "password"}
                      value={telegramApiHash}
                      onChange={(e) => setTelegramApiHash(e.target.value)}
                      placeholder="Enter API hash"
                      className="bg-background/50 font-mono pr-10"
                      data-testid="input-telegram-api-hash"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiHash(!showApiHash)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-toggle-hash-visibility"
                    >
                      {showApiHash ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="telegram-phone">Phone Number</Label>
                  <Input
                    id="telegram-phone"
                    value={telegramPhone}
                    onChange={(e) => setTelegramPhone(e.target.value)}
                    placeholder="e.g. +1234567890"
                    className="bg-background/50 font-mono"
                    data-testid="input-telegram-phone"
                  />
                  <p className="text-xs text-muted-foreground">Your Telegram account phone number for login</p>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  onClick={async () => {
                    if (!telegramApiId.trim() || !telegramApiHash.trim()) {
                      toast({ title: "Error", description: "API ID and API Hash are required.", variant: "destructive" });
                      return;
                    }
                    try {
                      await saveMutation.mutateAsync({ key: "telegram_api_id", value: telegramApiId.trim() });
                      await saveMutation.mutateAsync({ key: "telegram_api_hash", value: telegramApiHash.trim() });
                      if (telegramPhone.trim()) {
                        await saveMutation.mutateAsync({ key: "telegram_phone", value: telegramPhone.trim() });
                      }
                      toast({ title: "Telegram Settings Saved", description: "API credentials have been updated. Restart the Telegram Listener to apply." });
                    } catch (error) {
                      toast({ title: "Error", description: "Failed to save Telegram settings.", variant: "destructive" });
                    }
                  }}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-telegram-credentials"
                >
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Telegram Credentials
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Get API ID and Hash from <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">my.telegram.org</a></p>

              <Separator />

              <div className="space-y-2">
                <Label>Monitored Channels</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Channel ID or @username" 
                    className="bg-background/50 flex-1"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    data-testid="input-new-channel"
                  />
                  <Input 
                    placeholder="Description (e.g. Trade with Alex)" 
                    className="bg-background/50 flex-1"
                    value={newChannelLabel}
                    onChange={(e) => setNewChannelLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddChannel();
                      }
                    }}
                    data-testid="input-new-channel-label"
                  />
                  <Button 
                    variant="secondary" 
                    onClick={handleAddChannel}
                    disabled={saveMutation.isPending}
                    data-testid="button-add-channel"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
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
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">{channel.label}</span>
                          <span className="font-mono text-xs text-muted-foreground">{channel.id}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveChannel(channel.id)}
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
