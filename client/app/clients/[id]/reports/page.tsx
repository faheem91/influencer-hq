"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { storage } from "@/lib/storage";
import { Client, TrackedCreator, Agent } from "@/types";
import { ArrowLeft, Download, FileText, FileJson, Users, Bot } from "lucide-react";

export default function ClientReportsPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [creators, setCreators] = useState<TrackedCreator[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  const clientId = params.id as string;

  useEffect(() => {
    const clientData = storage.getClient(clientId);
    if (clientData) {
      setClient(clientData);
      setCreators(storage.getCreators(clientId));
      if (clientData.agentId) {
        setAgent(storage.getAgent(clientData.agentId) || null);
      }
    } else {
      router.push("/clients");
    }
  }, [clientId, router]);

  const handleExportCreatorsCSV = () => {
    const csv = storage.exportCreatorsCSV(clientId);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client?.name || "creators"}-creators.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCreatorsJSON = () => {
    const json = storage.exportCreators(clientId);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client?.name || "creators"}-creators.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportClientData = () => {
    if (!client) return;
    const data = {
      client,
      creators,
      agent,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name}-full-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!client) {
    return null;
  }

  return (
    <DashboardLayout
      title={`${client.name} - Reports`}
      description="Export reports and data"
    >
      <div className="space-y-6">
        {/* Header */}
        <Button variant="ghost" asChild>
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Client
          </Link>
        </Button>

        {/* Export Options */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>Creators CSV</CardTitle>
              </div>
              <CardDescription>
                Export all tracked creators as a CSV file for use in spreadsheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm text-muted-foreground">
                <p>{creators.length} creators will be exported</p>
              </div>
              <Button onClick={handleExportCreatorsCSV} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                <CardTitle>Creators JSON</CardTitle>
              </div>
              <CardDescription>
                Export all tracked creators as a JSON file for developers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm text-muted-foreground">
                <p>Includes full creator data with engagement metrics</p>
              </div>
              <Button onClick={handleExportCreatorsJSON} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Full Report</CardTitle>
              </div>
              <CardDescription>
                Export complete client data including config, creators, and agent logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm text-muted-foreground">
                <p>Comprehensive backup of all client data</p>
              </div>
              <Button onClick={handleExportClientData} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Report Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Report Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Creators
                </p>
                <p className="text-2xl font-bold">{creators.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Added to IMAI
                </p>
                <p className="text-2xl font-bold">
                  {creators.filter((c) => c.addedToImai).length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-2xl font-bold">
                  {creators.filter((c) => !c.addedToImai).length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Agent Runs
                </p>
                <p className="text-2xl font-bold">{agent?.logs.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
