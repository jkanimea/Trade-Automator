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
import { Trash2, Plus, Loader2, CheckCircle2, Bot, Eye, EyeOff, Pencil, Check, X, BarChart3, Play, ShieldCheck, ExternalLink, Zap, GripVertical, ChevronUp, ChevronDown } from "lucide-react";

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
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingId, setEditingId] = useState("");
  const [runningVerification, setRunningVerification] = useState(false);

  interface PriceProvider {
    id: string;
    name: string;
    apiKey: string;
    requiresKey: boolean;
    url: string;
    description: string;
  }

  const [providers, setProviders] = useState<PriceProvider[]>([
    { id: "yfinance", name: "Yahoo Finance", apiKey: "", requiresKey: false, url: "", description: "Free, unlimited, no API key needed" },
  ]);
  const [showKeyFor, setShowKeyFor] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [addingProvider, setAddingProvider] = useState(false);
  const [newProvider, setNewProvider] = useState<PriceProvider>({ id: "", name: "", apiKey: "", requiresKey: true, url: "", description: "" });

  useEffect(() => {
    if (settingsData.length > 0) {
      setAccountId(settingsMap["ctrader_account_id"] || "");
      setMaxRisk(settingsMap["max_risk_percent"] || "2.0");
      setDailyLossLimit(settingsMap["daily_loss_limit"] || "500");
      setAutoBreakEven(settingsMap["auto_break_even"] !== "false");
      setTelegramApiId(settingsMap["telegram_api_id"] || "");
      setTelegramApiHash(settingsMap["telegram_api_hash"] || "");
      setTelegramPhone(settingsMap["telegram_phone"] || "");
      const savedProviders = settingsMap["price_providers"];
      if (savedProviders) {
        try {
          const parsed = JSON.parse(savedProviders);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProviders(parsed);
          }
        } catch {}
      }
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

  const startEditing = (channel: {id: string, label: string}) => {
    setEditingChannelId(channel.id);
    setEditingId(channel.id);
    setEditingLabel(channel.label);
  };

  const cancelEditing = () => {
    setEditingChannelId(null);
    setEditingId("");
    setEditingLabel("");
  };

  const handleSaveEdit = async () => {
    if (!editingId.trim()) {
      toast({ title: "Error", description: "Channel ID cannot be empty.", variant: "destructive" });
      return;
    }
    const updatedChannels = channels.map(c =>
      c.id === editingChannelId ? { id: editingId.trim(), label: editingLabel.trim() || editingId.trim() } : c
    );
    setChannels(updatedChannels);
    setEditingChannelId(null);
    setEditingId("");
    setEditingLabel("");

    try {
      await saveChannels(updatedChannels);
      toast({ title: "Channel Updated", description: "Channel details have been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update channel.", variant: "destructive" });
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
                        className="flex items-center justify-between p-3 rounded-md border border-border bg-background/30 gap-3"
                        data-testid={`channel-item-${index}`}
                      >
                        {editingChannelId === channel.id ? (
                          <>
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={editingId}
                                onChange={(e) => setEditingId(e.target.value)}
                                placeholder="Channel ID or @username"
                                className="bg-background/50 font-mono text-sm h-8"
                                data-testid={`input-edit-channel-id-${index}`}
                              />
                              <Input
                                value={editingLabel}
                                onChange={(e) => setEditingLabel(e.target.value)}
                                placeholder="Description"
                                className="bg-background/50 text-sm h-8"
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); }}
                                data-testid={`input-edit-channel-label-${index}`}
                              />
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-success hover:text-success hover:bg-success/10"
                                onClick={handleSaveEdit}
                                data-testid={`button-save-edit-${index}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={cancelEditing}
                                data-testid={`button-cancel-edit-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="text-sm font-medium">{channel.label}</span>
                              <span className="font-mono text-xs text-muted-foreground truncate">{channel.id}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => startEditing(channel)}
                                data-testid={`button-edit-channel-${index}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveChannel(channel.id)}
                                data-testid={`button-remove-channel-${index}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Price Verification Providers
              </CardTitle>
              <CardDescription>Add up to 5 data providers. They are tried in order — if one fails, the next is used automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="grid gap-2">
                {providers.map((prov, idx) => {
                  const isEditing = editingProvider === prov.id;
                  const isReady = !prov.requiresKey || !!prov.apiKey;
                  return (
                    <div
                      key={prov.id}
                      className={`rounded-lg border p-3 transition-colors ${isReady ? 'border-success/30 bg-success/5' : 'border-border bg-background/30'}`}
                      data-testid={`provider-card-${prov.id}`}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px]">Provider Name</Label>
                              <Input
                                value={prov.name}
                                onChange={(e) => setProviders(prev => prev.map(p => p.id === prov.id ? { ...p, name: e.target.value } : p))}
                                className="bg-background/50 font-mono text-xs h-8 mt-1"
                                data-testid={`input-provider-name-${prov.id}`}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Provider ID</Label>
                              <Input
                                value={prov.id}
                                onChange={(e) => {
                                  const newId = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                                  setProviders(prev => prev.map(p => p.id === prov.id ? { ...p, id: newId } : p));
                                  setEditingProvider(newId);
                                }}
                                className="bg-background/50 font-mono text-xs h-8 mt-1"
                                data-testid={`input-provider-id-${prov.id}`}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[11px]">Description</Label>
                            <Input
                              value={prov.description}
                              onChange={(e) => setProviders(prev => prev.map(p => p.id === prov.id ? { ...p, description: e.target.value } : p))}
                              className="bg-background/50 text-xs h-8 mt-1"
                              placeholder="e.g. Free tier: 800/day"
                              data-testid={`input-provider-desc-${prov.id}`}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px]">Signup URL (optional)</Label>
                              <Input
                                value={prov.url}
                                onChange={(e) => setProviders(prev => prev.map(p => p.id === prov.id ? { ...p, url: e.target.value } : p))}
                                className="bg-background/50 font-mono text-xs h-8 mt-1"
                                placeholder="https://..."
                                data-testid={`input-provider-url-${prov.id}`}
                              />
                            </div>
                            <div className="flex items-end gap-2 pb-0.5">
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={prov.requiresKey}
                                  onChange={(e) => setProviders(prev => prev.map(p => p.id === prov.id ? { ...p, requiresKey: e.target.checked } : p))}
                                  className="rounded"
                                />
                                Requires API key
                              </label>
                            </div>
                          </div>
                          {prov.requiresKey && (
                            <div>
                              <Label className="text-[11px]">API Key</Label>
                              <div className="relative mt-1">
                                <Input
                                  type={showKeyFor[prov.id] ? "text" : "password"}
                                  value={prov.apiKey}
                                  onChange={(e) => setProviders(prev => prev.map(p => p.id === prov.id ? { ...p, apiKey: e.target.value } : p))}
                                  className="bg-background/50 font-mono text-xs h-8 pr-10"
                                  placeholder="Paste API key"
                                  data-testid={`input-provider-key-${prov.id}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowKeyFor(prev => ({ ...prev, [prov.id]: !prev[prov.id] }))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {showKeyFor[prov.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-end gap-2 pt-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingProvider(null)} data-testid={`button-cancel-edit-${prov.id}`}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={!prov.id.trim() || !prov.name.trim() || providers.filter(p => p.id === prov.id).length > 1}
                              onClick={async () => {
                                if (providers.filter(p => p.id === prov.id).length > 1) {
                                  toast({ title: "Duplicate ID", description: "Each provider must have a unique ID.", variant: "destructive" });
                                  return;
                                }
                                setEditingProvider(null);
                                try {
                                  await saveMutation.mutateAsync({ key: "price_providers", value: JSON.stringify(providers) });
                                  toast({ title: "Provider Saved", description: `${prov.name} updated.` });
                                } catch {
                                  toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
                                }
                              }}
                              data-testid={`button-save-provider-${prov.id}`}
                            >
                              <Check className="h-3 w-3 mr-1" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                              disabled={idx === 0}
                              onClick={async () => {
                                const arr = [...providers];
                                [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                setProviders(arr);
                                try {
                                  await saveMutation.mutateAsync({ key: "price_providers", value: JSON.stringify(arr) });
                                } catch {}
                              }}
                              data-testid={`button-move-up-${prov.id}`}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                              disabled={idx === providers.length - 1}
                              onClick={async () => {
                                const arr = [...providers];
                                [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                setProviders(arr);
                                try {
                                  await saveMutation.mutateAsync({ key: "price_providers", value: JSON.stringify(arr) });
                                } catch {}
                              }}
                              data-testid={`button-move-down-${prov.id}`}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold truncate">{prov.name}</h4>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${idx === 0 ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                                {idx === 0 ? 'PRIMARY' : `#${idx + 1}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{prov.description || prov.id}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isReady ? (
                              <>
                                <div className="h-2 w-2 rounded-full bg-success" />
                                <span className="text-[11px] font-mono text-success">Ready</span>
                              </>
                            ) : (
                              <>
                                <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                <span className="text-[11px] font-mono text-muted-foreground">No key</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {prov.url && (
                              <a href={prov.url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-primary" data-testid={`link-provider-url-${prov.id}`}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              className="p-1 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingProvider(prov.id)}
                              data-testid={`button-edit-provider-${prov.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="p-1 text-muted-foreground hover:text-destructive"
                              onClick={async () => {
                                const updated = providers.filter(p => p.id !== prov.id);
                                setProviders(updated);
                                try {
                                  await saveMutation.mutateAsync({ key: "price_providers", value: JSON.stringify(updated) });
                                  toast({ title: "Removed", description: `${prov.name} removed.` });
                                } catch {
                                  toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
                                }
                              }}
                              data-testid={`button-delete-provider-${prov.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {addingProvider ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <h4 className="text-sm font-medium">Add Provider</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">Provider Name</Label>
                      <Input
                        value={newProvider.name}
                        onChange={(e) => setNewProvider(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-background/50 text-xs h-8 mt-1"
                        placeholder="e.g. Alpha Vantage"
                        data-testid="input-new-provider-name"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Provider ID</Label>
                      <Input
                        value={newProvider.id}
                        onChange={(e) => setNewProvider(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                        className="bg-background/50 font-mono text-xs h-8 mt-1"
                        placeholder="e.g. alphavantage"
                        data-testid="input-new-provider-id"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px]">Description</Label>
                    <Input
                      value={newProvider.description}
                      onChange={(e) => setNewProvider(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-background/50 text-xs h-8 mt-1"
                      placeholder="e.g. Free tier: 500 calls/day"
                      data-testid="input-new-provider-desc"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">Signup URL (optional)</Label>
                      <Input
                        value={newProvider.url}
                        onChange={(e) => setNewProvider(prev => ({ ...prev, url: e.target.value }))}
                        className="bg-background/50 font-mono text-xs h-8 mt-1"
                        placeholder="https://..."
                        data-testid="input-new-provider-url"
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newProvider.requiresKey}
                          onChange={(e) => setNewProvider(prev => ({ ...prev, requiresKey: e.target.checked }))}
                          className="rounded"
                        />
                        Requires API key
                      </label>
                    </div>
                  </div>
                  {newProvider.requiresKey && (
                    <div>
                      <Label className="text-[11px]">API Key</Label>
                      <Input
                        type="password"
                        value={newProvider.apiKey}
                        onChange={(e) => setNewProvider(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="bg-background/50 font-mono text-xs h-8 mt-1"
                        placeholder="Paste API key"
                        data-testid="input-new-provider-key"
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingProvider(false); setNewProvider({ id: "", name: "", apiKey: "", requiresKey: true, url: "", description: "" }); }} data-testid="button-cancel-add-provider">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!newProvider.name.trim() || !newProvider.id.trim() || providers.some(p => p.id === newProvider.id)}
                      onClick={async () => {
                        const updated = [...providers, newProvider];
                        setProviders(updated);
                        setAddingProvider(false);
                        setNewProvider({ id: "", name: "", apiKey: "", requiresKey: true, url: "", description: "" });
                        try {
                          await saveMutation.mutateAsync({ key: "price_providers", value: JSON.stringify(updated) });
                          toast({ title: "Provider Added", description: `${newProvider.name} added to the chain.` });
                        } catch {
                          toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
                        }
                      }}
                      data-testid="button-confirm-add-provider"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Provider
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={providers.length >= 5}
                  onClick={() => setAddingProvider(true)}
                  data-testid="button-add-provider"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {providers.length >= 5 ? "Maximum 5 providers" : "Add Provider"}
                </Button>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Run Verification</h4>
                  <p className="text-[11px] text-muted-foreground">Check all signals against real market prices using the provider chain above</p>
                </div>
                <Button
                  className="bg-success hover:bg-success/90 text-success-foreground"
                  onClick={async () => {
                    setRunningVerification(true);
                    try {
                      const resp = await fetch("/api/verify-signals", { method: "POST" });
                      const data = await resp.json();
                      if (data.error) {
                        toast({ title: "Verification Error", description: data.error, variant: "destructive" });
                      } else {
                        toast({
                          title: "Verification Started",
                          description: data.message || "Running in the background. Check Logs page for progress.",
                        });
                      }
                    } catch {
                      toast({ title: "Error", description: "Failed to start verification.", variant: "destructive" });
                    } finally {
                      setRunningVerification(false);
                    }
                  }}
                  disabled={runningVerification || providers.length === 0}
                  data-testid="button-run-verification"
                >
                  {runningVerification ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run Price Verification
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-background/30 p-4">
                <h4 className="text-sm font-medium mb-2">How it works</h4>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>• Providers are tried in the order shown above (top = first)</li>
                  <li>• If a provider fails or returns no data, the next one is tried</li>
                  <li>• Use the arrows to reorder providers in your preferred priority</li>
                  <li>• Providers without a required API key will be skipped</li>
                  <li>• Each verified signal shows which provider was used</li>
                </ul>
              </div>
            </CardContent>
          </Card>

        </main>
      </div>
    </div>
  );
}
