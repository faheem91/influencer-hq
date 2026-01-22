"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient, updateClient } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrackingConfig } from "./tracking-config";

interface ClientFormData {
  name: string;
  logo?: string;
  description?: string;
  tracking: {
    instagram: { handle: string; hashtags: string[]; locations: string[] };
    facebook: { handle: string; hashtags: string[]; locations: string[] };
    tiktok: { handle: string; hashtags: string[] };
  };
  imai: {
    campaignId: string;
  };
  checkInterval: number;
}

const defaultFormData: ClientFormData = {
  name: "",
  logo: "",
  description: "",
  tracking: {
    instagram: { handle: "", hashtags: [], locations: [] },
    facebook: { handle: "", hashtags: [], locations: [] },
    tiktok: { handle: "", hashtags: [] },
  },
  imai: {
    campaignId: "",
  },
  checkInterval: 12,
};

interface ClientFormProps {
  initialData?: ClientFormData;
  clientId?: string;
  isEditing?: boolean;
}

export function ClientForm({
  initialData,
  clientId,
  isEditing = false,
}: ClientFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ClientFormData>(
    initialData || defaultFormData
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        if (isEditing && clientId) {
          await updateClient(clientId, {
            name: formData.name,
            logo: formData.logo || null,
            description: formData.description || null,
            tracking: formData.tracking,
            imaiCampaignId: formData.imai.campaignId || null,
            checkInterval: formData.checkInterval,
          });
        } else {
          await createClient({
            name: formData.name,
            logo: formData.logo || null,
            description: formData.description || null,
            tracking: formData.tracking,
            imaiCampaignId: formData.imai.campaignId || null,
            checkInterval: formData.checkInterval,
          });
        }
        router.push("/clients");
      } catch (error) {
        console.error("Error saving client:", error);
      }
    });
  };

  const updateTracking = (
    platform: "instagram" | "facebook" | "tiktok",
    field: string,
    value: string | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      tracking: {
        ...prev.tracking,
        [platform]: {
          ...prev.tracking[platform],
          [field]: value,
        },
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Dubai Restaurants"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={formData.logo || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logo: e.target.value }))
                }
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Brief description of the client..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tracking Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="instagram">
            <TabsList className="mb-4">
              <TabsTrigger value="instagram">Instagram</TabsTrigger>
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="tiktok">TikTok</TabsTrigger>
            </TabsList>

            <TabsContent value="instagram">
              <TrackingConfig
                platform="instagram"
                handle={formData.tracking.instagram.handle}
                hashtags={formData.tracking.instagram.hashtags}
                locations={formData.tracking.instagram.locations}
                onHandleChange={(value) =>
                  updateTracking("instagram", "handle", value)
                }
                onHashtagsChange={(value) =>
                  updateTracking("instagram", "hashtags", value)
                }
                onLocationsChange={(value) =>
                  updateTracking("instagram", "locations", value)
                }
                showLocations
              />
            </TabsContent>

            <TabsContent value="facebook">
              <TrackingConfig
                platform="facebook"
                handle={formData.tracking.facebook.handle}
                hashtags={formData.tracking.facebook.hashtags}
                locations={formData.tracking.facebook.locations}
                onHandleChange={(value) =>
                  updateTracking("facebook", "handle", value)
                }
                onHashtagsChange={(value) =>
                  updateTracking("facebook", "hashtags", value)
                }
                onLocationsChange={(value) =>
                  updateTracking("facebook", "locations", value)
                }
                showLocations
              />
            </TabsContent>

            <TabsContent value="tiktok">
              <TrackingConfig
                platform="tiktok"
                handle={formData.tracking.tiktok.handle}
                hashtags={formData.tracking.tiktok.hashtags}
                onHandleChange={(value) =>
                  updateTracking("tiktok", "handle", value)
                }
                onHashtagsChange={(value) =>
                  updateTracking("tiktok", "hashtags", value)
                }
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* IMAI Integration */}
      <Card>
        <CardHeader>
          <CardTitle>IMAI Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            IMAI credentials are configured globally in Settings. Only the Campaign ID is needed per client.
          </p>
          <div className="space-y-2">
            <Label htmlFor="imaiCampaignId">IMAI Campaign ID</Label>
            <Input
              id="imaiCampaignId"
              value={formData.imai.campaignId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  imai: { ...prev.imai, campaignId: e.target.value },
                }))
              }
              placeholder="Campaign ID to add creators to"
            />
            <p className="text-sm text-muted-foreground">
              Find this in your IMAI campaign URL (e.g., imai.co/campaigns/12345)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Agent Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="checkInterval">Check Interval (hours)</Label>
            <Input
              id="checkInterval"
              type="number"
              min={1}
              max={168}
              value={formData.checkInterval}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  checkInterval: parseInt(e.target.value) || 12,
                }))
              }
            />
            <p className="text-sm text-muted-foreground">
              How often the agent should check for new mentions (12 hours for
              stories, 24 hours for feed posts recommended)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/clients")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : isEditing
            ? "Update Client"
            : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
