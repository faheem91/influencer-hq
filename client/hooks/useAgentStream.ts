"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface TerminalLog {
  timestamp: string;
  level: "info" | "success" | "error" | "warning";
  message: string;
  details?: string | Record<string, unknown>;
}

interface SSEMessage {
  type: "log" | "status" | "connected";
  timestamp?: string;
  level?: "info" | "success" | "error" | "warning";
  message?: string;
  details?: string | Record<string, unknown>;
  status?: "starting" | "completed" | "error" | "stopped";
  error?: string;
  result?: unknown;
}

interface UseAgentStreamOptions {
  apiUrl?: string;
  autoConnect?: boolean;
}

export function useAgentStream(
  agentId: string,
  options: UseAgentStreamOptions = {}
) {
  const { apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", autoConnect = true } = options;

  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<"idle" | "running" | "error" | "completed">("idle");
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    console.log(`[SSE] Connecting to agent ${agentId}...`);

    const eventSource = new EventSource(`${apiUrl}/api/agents/${agentId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log(`[SSE] Connected to agent ${agentId}`);
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log(`[SSE] Received connection confirmation`);
          return;
        }

        if (data.type === "log" && data.level && data.message) {
          const log: TerminalLog = {
            timestamp: data.timestamp || new Date().toISOString(),
            level: data.level,
            message: data.message,
            details: data.details,
          };

          setLogs((prev) => [...prev, log]);
        }

        if (data.type === "status") {
          switch (data.status) {
            case "starting":
              setAgentStatus("running");
              break;
            case "completed":
              setAgentStatus("completed");
              break;
            case "error":
              setAgentStatus("error");
              if (data.error) {
                setError(data.error);
              }
              break;
            case "stopped":
              setAgentStatus("idle");
              break;
          }
        }
      } catch (err) {
        console.error("[SSE] Failed to parse message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error(`[SSE] Connection error:`, err);
      setIsConnected(false);

      // Close and attempt reconnect
      eventSource.close();

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`[SSE] Attempting to reconnect...`);
        connect();
      }, 3000);
    };
  }, [agentId, apiUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const addLog = useCallback((log: TerminalLog) => {
    setLogs((prev) => [...prev, log]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    logs,
    isConnected,
    agentStatus,
    error,
    connect,
    disconnect,
    clearLogs,
    addLog,
  };
}

// API functions for agent control
export async function runAgentNow(
  agentId: string,
  data: {
    client: {
      id: string;
      name: string;
      imaiCampaignId: string;
    };
    imaiCredentials: {
      email: string;
      password: string;
    };
    creators: Array<{ username: string }>;
  },
  apiUrl: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const response = await fetch(`${apiUrl}/api/agents/${agentId}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
}

export async function stopAgent(
  agentId: string,
  apiUrl: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
): Promise<{ success: boolean; wasStopped?: boolean; error?: string }> {
  const response = await fetch(`${apiUrl}/api/agents/${agentId}/stop`, {
    method: "POST",
  });

  return response.json();
}

export async function getAgentStatus(
  agentId: string,
  apiUrl: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
): Promise<{
  agentId: string;
  isScheduled: boolean;
  isRunning: boolean;
  nextRun: string | null;
}> {
  const response = await fetch(`${apiUrl}/api/agents/${agentId}/status`);
  return response.json();
}

export async function testImaiLogin(
  email: string,
  password: string,
  apiUrl: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${apiUrl}/api/agents/test-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return response.json();
}
