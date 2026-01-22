"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Terminal, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalLog {
  timestamp: string;
  level: "info" | "success" | "error" | "warning";
  message: string;
  details?: string | Record<string, unknown>;
}

interface AgentTerminalProps {
  agentId: string;
  clientName: string;
  status: "idle" | "running" | "error" | "paused";
  nextRun?: string;
  onRunNow: () => void;
  onStop: () => void;
  logs: TerminalLog[];
  isConnected: boolean;
}

export function AgentTerminal({
  agentId,
  clientName,
  status,
  nextRun,
  onRunNow,
  onStop,
  logs,
  isConnected,
}: AgentTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getNextRunDisplay = () => {
    if (!nextRun) return null;
    const next = new Date(nextRun);
    const now = new Date();
    const diff = next.getTime() - now.getTime();

    if (diff <= 0) return "Soon";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-blue-400";
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "success":
        return "SUCCESS";
      case "error":
        return "ERROR";
      case "warning":
        return "WARN";
      default:
        return "INFO";
    }
  };

  const getStatusBadgeVariant = () => {
    switch (status) {
      case "running":
        return "default" as const;
      case "error":
        return "destructive" as const;
      case "paused":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <Card className="overflow-hidden border-zinc-800 bg-zinc-950">
      <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 bg-zinc-900 py-3 px-4">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-zinc-400" />
          <div>
            <CardTitle className="text-sm font-medium text-white">
              IMAI Agent Console
            </CardTitle>
            <p className="text-xs text-zinc-500">{clientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-zinc-600"
              )}
            />
            <span className="text-xs text-zinc-500">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Status badge */}
          <Badge variant={getStatusBadgeVariant()} className="capitalize">
            {status}
          </Badge>

          {/* Action buttons */}
          {status === "running" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={onStop}
              className="h-7 px-2"
            >
              <Square className="mr-1 h-3 w-3" />
              Stop
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onRunNow}
              className="h-7 bg-green-600 hover:bg-green-700 px-2"
            >
              <Play className="mr-1 h-3 w-3" />
              Run Now
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Terminal output */}
        <div
          ref={terminalRef}
          className="h-[400px] overflow-y-auto bg-zinc-950 p-4 font-mono text-sm"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        >
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-zinc-600">
              <div className="text-center">
                <Terminal className="mx-auto mb-2 h-8 w-8" />
                <p>No logs yet. Click &quot;Run Now&quot; to start the agent.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-zinc-600">&gt;</span>
                  <span className="text-zinc-500 shrink-0">
                    {formatTime(log.timestamp)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 w-16 text-xs font-semibold",
                      getLevelColor(log.level)
                    )}
                  >
                    [{getLevelBadge(log.level)}]
                  </span>
                  <span className="text-zinc-300">{log.message}</span>
                  {log.details && (
                    <span className="text-zinc-500">
                      {typeof log.details === "string"
                        ? ` ${log.details}`
                        : ` ${JSON.stringify(log.details)}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer status bar */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4 py-2">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            {nextRun && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Next run: {getNextRunDisplay()}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              <span>{logs.length} log entries</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
