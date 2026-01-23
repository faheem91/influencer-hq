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
import { getClient, getCreators, exportCreatorsCSV, discoverCreators } from "@/db/queries";
import { Client, TrackedCreator } from "@/db/schema";
import { ArrowLeft, Download, Users, ExternalLink, Search, Loader2, RefreshCw } from "lucide-react";

export default function ClientCreatorsPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [creators, setCreators] = useState<TrackedCreator[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<{ discovered: number; errors: string[] } | null>(null);
  const clientId = params.id as string;

  const loadData = async () => {
    const clientData = await getClient(clientId);
    if (clientData) {
      setClient(clientData);
      const creatorsData = await getCreators(clientId);
      setCreators(creatorsData);
    } else {
      router.push("/clients");
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadData();
    });
  }, [clientId, router]);

  const handleDiscoverCreators = async () => {
    if (!client) return;

    // Collect all hashtags from all platforms
    const hashtags: string[] = [];
    if (client.tracking?.instagram?.hashtags) {
      hashtags.push(...client.tracking.instagram.hashtags);
    }
    if (client.tracking?.facebook?.hashtags) {
      hashtags.push(...client.tracking.facebook.hashtags);
    }
    if (client.tracking?.tiktok?.hashtags) {
      hashtags.push(...client.tracking.tiktok.hashtags);
    }

    if (hashtags.length === 0) {
      setDiscoveryResult({ discovered: 0, errors: ["No hashtags configured. Go to Edit to add hashtags."] });
      return;
    }

    setIsDiscovering(true);
    setDiscoveryResult(null);

    try {
      const result = await discoverCreators(client.id, hashtags);
      setDiscoveryResult(result);
      // Refresh the creators list
      startTransition(() => {
        loadData();
      });
    } catch (error) {
      setDiscoveryResult({
        discovered: 0,
        errors: [`Discovery failed: ${error instanceof Error ? error.message : "Unknown error"}`]
      });
    } finally {
      setIsDiscovering(false);
    }
  };

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Client
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleDiscoverCreators}
              disabled={isDiscovering}
              className="bg-green-600 hover:bg-green-700"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Discover Creators
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={creators.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportJSON} disabled={creators.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Discovery Results */}
        {discoveryResult && (
          <Card className={discoveryResult.errors.length > 0 && discoveryResult.discovered === 0 ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-green-500 bg-green-50 dark:bg-green-950/20"}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  {discoveryResult.discovered > 0 && (
                    <p className="text-green-700 dark:text-green-400 font-medium">
                      Found {discoveryResult.discovered} new creator{discoveryResult.discovered !== 1 ? "s" : ""}!
                    </p>
                  )}
                  {discoveryResult.errors.length > 0 && (
                    <div className="text-sm text-red-700 dark:text-red-400 mt-1">
                      {discoveryResult.errors.map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                  {discoveryResult.discovered === 0 && discoveryResult.errors.length === 0 && (
                    <p className="text-muted-foreground">No new creators found. All creators from hashtags are already tracked.</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDiscoveryResult(null)}
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                <p className="text-muted-foreground mb-4">
                  Click "Discover Creators" to search Instagram for creators using your configured hashtags
                </p>
                <Button
                  onClick={handleDiscoverCreators}
                  disabled={isDiscovering}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isDiscovering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Discover Creators
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Hashtag</TableHead>
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
                        <Badge variant="secondary" className="font-medium">
                          {creator.sourceValue}
                        </Badge>
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
