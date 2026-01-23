"use client";

import { useState, useTransition, useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getClients, getAgents, getCreators, getImaiCredentials, setImaiCredentials, getOpenRouterSettings, setOpenRouterSettings } from "@/db/queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Trash2, Key, Bell, Database, Check, Loader2, Bot } from "lucide-react";

// Available OpenRouter models for AI vision
const OPENROUTER_MODELS = [
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (Recommended)", description: "Fast and cost-effective" },
  { value: "openai/gpt-4o", label: "GPT-4o", description: "Most capable, higher cost" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", description: "Excellent reasoning" },
  { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku", description: "Fast and affordable" },
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", description: "Google's latest fast model" },
];

export default function SettingsPage() {
  const [imaiEmail, setImaiEmail] = useState("");
  const [imaiPassword, setImaiPassword] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRunEnabled, setAutoRunEnabled] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  // OpenRouter settings
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openRouterModel, setOpenRouterModel] = useState("openai/gpt-4o-mini");
  const [isLoadingOpenRouter, setIsLoadingOpenRouter] = useState(true);
  const [isSavingOpenRouter, setIsSavingOpenRouter] = useState(false);
  const [openRouterSaved, setOpenRouterSaved] = useState(false);

  // Load IMAI credentials on mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const credentials = await getImaiCredentials();
        if (credentials) {
          setImaiEmail(credentials.email);
          setImaiPassword(credentials.password);
        }
      } catch (error) {
        console.error("Error loading IMAI credentials:", error);
      } finally {
        setIsLoadingCredentials(false);
      }
    };
    loadCredentials();
  }, []);

  // Load OpenRouter settings on mount
  useEffect(() => {
    const loadOpenRouterSettings = async () => {
      try {
        const settings = await getOpenRouterSettings();
        if (settings) {
          setOpenRouterKey(settings.apiKey);
          setOpenRouterModel(settings.model);
        }
      } catch (error) {
        console.error("Error loading OpenRouter settings:", error);
      } finally {
        setIsLoadingOpenRouter(false);
      }
    };
    loadOpenRouterSettings();
  }, []);

  const handleSaveCredentials = async () => {
    if (!imaiEmail || !imaiPassword) {
      alert("Please enter both email and password");
      return;
    }

    setIsSavingCredentials(true);
    setCredentialsSaved(false);

    try {
      await setImaiCredentials(imaiEmail, imaiPassword);
      setCredentialsSaved(true);
      setTimeout(() => setCredentialsSaved(false), 3000);
    } catch (error) {
      console.error("Error saving IMAI credentials:", error);
      alert("Failed to save credentials. Please try again.");
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const handleSaveOpenRouter = async () => {
    if (!openRouterKey) {
      alert("Please enter an OpenRouter API key");
      return;
    }

    setIsSavingOpenRouter(true);
    setOpenRouterSaved(false);

    try {
      await setOpenRouterSettings(openRouterKey, openRouterModel);
      setOpenRouterSaved(true);
      setTimeout(() => setOpenRouterSaved(false), 3000);
    } catch (error) {
      console.error("Error saving OpenRouter settings:", error);
      alert("Failed to save OpenRouter settings. Please try again.");
    } finally {
      setIsSavingOpenRouter(false);
    }
  };

  const handleExportAll = async () => {
    startTransition(async () => {
      const [clients, agents, creators] = await Promise.all([
        getClients(),
        getAgents(),
        getCreators(),
      ]);
      const data = {
        clients,
        agents,
        creators,
        exportedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `influencer-hq-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleClearData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This cannot be undone. Note: This will only work if you have direct database access."
      )
    ) {
      alert("Data clearing requires direct database access. Please use database management tools to clear data.");
    }
  };

  return (
    <DashboardLayout
      title="Settings"
      description="Configure your application settings"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* IMAI Credentials */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>IMAI Credentials</CardTitle>
            </div>
            <CardDescription>
              Master IMAI account credentials used for automation. These credentials are used by all agents to log into IMAI and add influencers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingCredentials ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading credentials...
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="imaiEmail">IMAI Email</Label>
                  <Input
                    id="imaiEmail"
                    type="email"
                    value={imaiEmail}
                    onChange={(e) => setImaiEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imaiPassword">IMAI Password</Label>
                  <Input
                    id="imaiPassword"
                    type="password"
                    value={imaiPassword}
                    onChange={(e) => setImaiPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  onClick={handleSaveCredentials}
                  disabled={isSavingCredentials}
                  className={credentialsSaved ? "bg-green-600 hover:bg-green-600" : ""}
                >
                  {isSavingCredentials ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : credentialsSaved ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    "Save Credentials"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* OpenRouter AI Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle>AI Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure the AI model used for intelligent page analysis during automation. Get your API key from{" "}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                openrouter.ai/keys
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingOpenRouter ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading AI settings...
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="openRouterKey">OpenRouter API Key</Label>
                  <Input
                    id="openRouterKey"
                    type="password"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openRouterModel">AI Model</Label>
                  <Select value={openRouterModel} onValueChange={setOpenRouterModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPENROUTER_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex flex-col">
                            <span>{model.label}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    The AI analyzes screenshots to verify each step of the automation
                  </p>
                </div>
                <Button
                  onClick={handleSaveOpenRouter}
                  disabled={isSavingOpenRouter}
                  className={openRouterSaved ? "bg-green-600 hover:bg-green-600" : ""}
                >
                  {isSavingOpenRouter ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : openRouterSaved ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    "Save AI Settings"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications when agents find new creators
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-run Agents</p>
                <p className="text-sm text-muted-foreground">
                  Automatically run agents at scheduled intervals
                </p>
              </div>
              <Switch
                checked={autoRunEnabled}
                onCheckedChange={setAutoRunEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Data Management</CardTitle>
            </div>
            <CardDescription>
              Export, import, or clear your application data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" onClick={handleExportAll} disabled={isPending}>
                <Download className="mr-2 h-4 w-4" />
                Export All Data
              </Button>
              <Button variant="outline" disabled>
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Button>
            </div>
            <Separator />
            <div>
              <h4 className="mb-2 font-medium text-destructive">Danger Zone</h4>
              <p className="mb-4 text-sm text-muted-foreground">
                This action will permanently delete all your data including
                clients, agents, and tracked creators.
              </p>
              <Button variant="destructive" onClick={handleClearData}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Configure API endpoints and connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Instagram API Endpoint</Label>
              <Input
                value="http://localhost:4000"
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                The Instagram scraping backend API
              </p>
            </div>
            <div className="space-y-2">
              <Label>IMAI URL</Label>
              <Input
                value="https://imai.co"
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                IMAI platform for creator management
              </p>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Influencer HQ</strong> - Social Media Tracking
                Automation Platform
              </p>
              <p>Version 1.0.0</p>
              <p>
                Built with Next.js, TypeScript, Tailwind CSS, and ShadCN UI
              </p>
              <p className="text-green-600">
                Database: Vercel Postgres with Drizzle ORM
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
