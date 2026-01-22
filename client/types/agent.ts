export type AgentStatus = "idle" | "running" | "error" | "paused";

export interface Agent {
  id: string;
  clientId: string;
  clientName: string;
  status: AgentStatus;
  lastRun?: string;
  nextRun?: string;
  logs: AgentLog[];
  creatorsAdded: number;
  errors: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  action: string;
  result: "success" | "error" | "info";
  details?: string;
}

export interface AgentStats {
  totalAgents: number;
  runningAgents: number;
  idleAgents: number;
  errorAgents: number;
  pausedAgents: number;
  totalCreatorsAdded: number;
}

export interface IMAICredentials {
  email: string;
  password: string;
}
