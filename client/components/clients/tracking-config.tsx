"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface TrackingConfigProps {
  platform: "instagram" | "facebook" | "tiktok";
  handle: string;
  hashtags: string[];
  locations?: string[];
  onHandleChange: (value: string) => void;
  onHashtagsChange: (value: string[]) => void;
  onLocationsChange?: (value: string[]) => void;
  showLocations?: boolean;
}

export function TrackingConfig({
  platform,
  handle,
  hashtags,
  locations = [],
  onHandleChange,
  onHashtagsChange,
  onLocationsChange,
  showLocations = false,
}: TrackingConfigProps) {
  const [hashtagInput, setHashtagInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  const addHashtag = () => {
    if (hashtagInput.trim()) {
      const tag = hashtagInput.trim().replace(/^#/, "");
      if (!hashtags.includes(tag)) {
        onHashtagsChange([...hashtags, tag]);
      }
      setHashtagInput("");
    }
  };

  const removeHashtag = (tag: string) => {
    onHashtagsChange(hashtags.filter((h) => h !== tag));
  };

  const addLocation = () => {
    if (locationInput.trim() && onLocationsChange) {
      const loc = locationInput.trim();
      if (!locations.includes(loc)) {
        onLocationsChange([...locations, loc]);
      }
      setLocationInput("");
    }
  };

  const removeLocation = (loc: string) => {
    if (onLocationsChange) {
      onLocationsChange(locations.filter((l) => l !== loc));
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    action: () => void
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="space-y-6">
      {/* Handle */}
      <div className="space-y-2">
        <Label htmlFor={`${platform}-handle`}>@Handle to Monitor</Label>
        <Input
          id={`${platform}-handle`}
          value={handle}
          onChange={(e) => onHandleChange(e.target.value.replace(/^@/, ""))}
          placeholder={`${platform} username (without @)`}
        />
        <p className="text-sm text-muted-foreground">
          Track mentions of @{handle || "username"}
        </p>
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <Label>Hashtags to Track</Label>
        <div className="flex gap-2">
          <Input
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, addHashtag)}
            placeholder="Enter hashtag (without #)"
          />
          <Button type="button" onClick={addHashtag} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {hashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                #{tag}
                <button
                  type="button"
                  onClick={() => removeHashtag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Locations */}
      {showLocations && (
        <div className="space-y-2">
          <Label>Locations to Track</Label>
          <div className="flex gap-2">
            <Input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, addLocation)}
              placeholder="Enter location name"
            />
            <Button type="button" onClick={addLocation} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {locations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {locations.map((loc) => (
                <Badge key={loc} variant="secondary" className="gap-1">
                  {loc}
                  <button
                    type="button"
                    onClick={() => removeLocation(loc)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
