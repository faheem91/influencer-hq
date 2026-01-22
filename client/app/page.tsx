"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { storage } from "@/lib/storage";
import { Client, Agent, AgentStats } from "@/types";
import {
  Users,
  Bot,
  UserPlus,
  TrendingUp,
  ArrowRight,
  Activity,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats>({
    totalAgents: 0,
    runningAgents: 0,
    idleAgents: 0,
    errorAgents: 0,
    pausedAgents: 0,
    totalCreatorsAdded: 0,
  });

  useEffect(() => {
    setClients(storage.getClients());
    setAgents(storage.getAgents());
    setAgentStats(storage.getAgentStats());
  }, []);

  const recentClients = clients.slice(0, 5);
  const recentAgents = agents.slice(0, 5);

  return (
    <DashboardLayout
      title="Dashboard"
      description="Overview of your influencer tracking operations"
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
              <p className="text-xs text-muted-foreground">
                Brands being tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Agents
              </CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {agentStats.runningAgents}
              </div>
              <p className="text-xs text-muted-foreground">
                {agentStats.totalAgents} total agents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Creators Added
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {agentStats.totalCreatorsAdded}
              </div>
              <p className="text-xs text-muted-foreground">
                Added to IMAI campaigns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Agent Errors
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentStats.errorAgents}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Clients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Clients</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/clients">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentClients.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8" />
                  <p>No clients yet</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/clients/new">Add your first client</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentClients.map((client) => (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{client.tracking.instagram.handle || "No handle"}
                          </p>
                        </div>
                      </div>
                      {client.agentId ? (
                        <Badge variant="success">Agent Active</Badge>
                      ) : (
                        <Badge variant="secondary">No Agent</Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Agent Status</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/agents">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentAgents.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Bot className="mx-auto mb-2 h-8 w-8" />
                  <p>No agents running</p>
                  <p className="text-sm">
                    Create a client and spawn an agent to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAgents.map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            agent.status === "running"
                              ? "bg-green-100 text-green-600"
                              : agent.status === "error"
                              ? "bg-red-100 text-red-600"
                              : agent.status === "paused"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <Bot className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{agent.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {agent.creatorsAdded} creators added
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          agent.status === "running"
                            ? "success"
                            : agent.status === "error"
                            ? "destructive"
                            : agent.status === "paused"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link href="/clients/new">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add New Client
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/agents">
                  <Bot className="mr-2 h-4 w-4" />
                  Manage Agents
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Reports
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
