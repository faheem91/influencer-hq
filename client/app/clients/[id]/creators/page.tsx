"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getClient, getCreators, exportCreatorsCSV } from "@/db/queries";
import { Client, TrackedCreator } from "@/db/schema";
import { ArrowLeft, Download, Users, ExternalLink } from "lucide-react";

export default function ClientCreatorsPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [creators, setCreators] = useState<TrackedCreator[]>([]);
  const [isPending, startTransition] = useTransition();
  const clientId = params.id as string;

  useEffect(() => {
    startTransition(async () => {
      const clientData = await getClient(clientId);
      if (clientData) {
        setClient(clientData);
        const creatorsData = await getCreators(clientId);
        setCreators(creatorsData);
      } else {
        router.push("/clients");
      }
    });
  }, [clientId, router]);

  const handleExportCSV = async () => {
    const csv = await exportCreatorsCSV(clientId);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client?.name || "creators"}-creators.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(creators, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client?.name || "creators"}-creators.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!client) {
    return null;
  }

  return (
    <DashboardLayout
      title={`${client.name} - Creators`}
      description="Tracked creators for this client"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Client
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportJSON}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{creators.length}</p>
                <p className="text-sm text-muted-foreground">Total Creators</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {creators.filter((c) => c.addedToImai).length}
                </p>
                <p className="text-sm text-muted-foreground">Added to IMAI</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {creators.filter((c) => c.sourceType === "mention").length}
                </p>
                <p className="text-sm text-muted-foreground">From Mentions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {creators.filter((c) => c.sourceType === "hashtag").length}
                </p>
                <p className="text-sm text-muted-foreground">From Hashtags</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Creators Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tracked Creators</CardTitle>
          </CardHeader>
          <CardContent>
            {creators.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No creators yet</h3>
                <p className="text-muted-foreground">
                  Creators will appear here once the agent starts tracking
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Discovered</TableHead>
                    <TableHead>IMAI Status</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creators.map((creator) => (
                    <TableRow key={creator.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={creator.profilePicUrl || undefined} />
                            <AvatarFallback>
                              {creator.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">@{creator.username}</p>
                            {creator.fullName && (
                              <p className="text-sm text-muted-foreground">
                                {creator.fullName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {creator.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="secondary" className="capitalize">
                            {creator.sourceType}
                          </Badge>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {creator.sourceValue}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(creator.discoveredAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {creator.addedToImai ? (
                          <Badge variant="success">Added</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {creator.engagement && (
                          <div className="text-sm">
                            <p>{creator.engagement.likes} likes</p>
                            <p>{creator.engagement.comments} comments</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`https://instagram.com/${creator.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
