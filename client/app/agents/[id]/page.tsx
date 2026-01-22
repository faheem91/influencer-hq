"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";
import { AgentLogs } from "@/components/agents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAgent,
  getClient,
  getAgentLogs,
  updateAgentStatus,
  addAgentLog,
} from "@/db/queries";
import { Agent, Client, AgentLog } from "@/db/schema";
import {
  ArrowLeft,
  Bot,
  Play,
  Pause,
  RefreshCw,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isPending, startTransition] = useTransition();
  const agentId = params.id as string;

  const loadData = () => {
    startTransition(async () => {
      const agentData = await getAgent(agentId);
      if (agentData) {
        setAgent(agentData);
        const clientData = await getClient(agentData.clientId);
        if (clientData) {
          setClient(clientData);
        }
        const logsData = await getAgentLogs(agentId);
        setLogs(logsData);
      } else {
        router.push("/agents");
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [agentId, router]);

  const handleStatusChange = (status: Agent["status"]) => {
    if (agent) {
      startTransition(async () => {
        await updateAgentStatus(agent.id, status);
        loadData();
      });
    }
  };

  const handleManualRun = () => {
    if (agent) {
      startTransition(async () => {
        // Log the manual run trigger
        await addAgentLog(agent.id, {
          action: "Manual run triggered",
          result: "info",
          details: "Agent will check for new mentions",
        });
        await updateAgentStatus(agent.id, "running");

        // Simulate some work (in a real app, this would trigger actual agent work)
        setTimeout(async () => {
          await addAgentLog(agent.id, {
            action: "Checking Instagram mentions",
            result: "success",
            details: `Searched for @${client?.tracking?.instagram?.handle || "handle"}`,
          });
          loadData();
        }, 1000);

        setTimeout(async () => {
          await addAgentLog(agent.id, {
            action: "Checking hashtags",
            result: "success",
            details: `Searched ${
              (client?.tracking?.instagram?.hashtags?.length || 0) +
              (client?.tracking?.facebook?.hashtags?.length || 0) +
              (client?.tracking?.tiktok?.hashtags?.length || 0)
            } hashtags`,
          });
          await updateAgentStatus(agent.id, "idle");
          loadData();
        }, 2000);

        loadData();
      });
    }
  };

  if (!agent) {
    return null;
  }

  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "running":
        return "success";
      case "error":
        return "destructive";
      case "paused":
        return "warning";
      default:
        return "secondary";
    }
  };

  // Convert logs to the format expected by AgentLogs component
  const formattedLogs = logs.map((log) => ({
    timestamp: log.timestamp.toISOString(),
    action: log.action,
    result: log.result,
    details: log.details || undefined,
  }));

  return (
    <DashboardLayout
      title={`Agent - ${agent.clientName}`}
      description="Agent details and logs"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" asChild>
            <Link href="/agents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Agents
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleManualRun}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Now
            </Button>
            {agent.status === "running" ? (
              <Button
                variant="secondary"
                onClick={() => handleStatusChange("paused")}
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            ) : (
              <Button onClick={() => handleStatusChange("running")}>
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            )}
          </div>
        </div>

        {/* Agent Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Agent Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Client
                  </p>
                  <p className="font-medium">{agent.clientName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <Badge variant={getStatusColor(agent.status)}>
                    {agent.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Created
                  </p>
                  <p>{new Date(agent.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Last Run
                  </p>
                  <p>
                    {agent.lastRun
                      ? new Date(agent.lastRun).toLocaleString()
                      : "Never"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Check Interval
                  </p>
                  <p>{client?.checkInterval || 12} hours</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Agent ID
                  </p>
                  <p className="font-mono text-sm">{agent.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Creators Added</span>
                </div>
                <span className="text-xl font-bold">{agent.creatorsAdded}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Total Runs</span>
                </div>
                <span className="text-xl font-bold">
                  {logs.filter((l) => l.action.includes("run")).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Errors</span>
                </div>
                <span className="text-xl font-bold text-red-600">
                  {(agent.errors as string[] || []).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Activity Logs</CardTitle>
            <p className="text-sm text-muted-foreground">
              {logs.length} entries
            </p>
          </CardHeader>
          <CardContent>
            <AgentLogs logs={formattedLogs} />
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href={`/clients/${agent.clientId}`}>
                  <Bot className="mr-2 h-4 w-4" />
                  View Client
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/clients/${agent.clientId}/creators`}>
                  <Users className="mr-2 h-4 w-4" />
                  View Creators
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/clients/${agent.clientId}/edit`}>
                  Edit Tracking Config
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
