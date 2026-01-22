"use server";

import { db } from "./index";
import {
  clients,
  agents,
  agentLogs,
  trackedCreators,
  Client,
  NewClient,
  Agent,
  NewAgent,
  AgentLog,
  TrackedCreator,
} from "./schema";
import { eq, desc, count } from "drizzle-orm";

// ============= Client Operations =============

export async function getClients(): Promise<Client[]> {
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClient(id: string): Promise<Client | undefined> {
  const result = await db.select().from(clients).where(eq(clients.id, id));
  return result[0];
}

export async function createClient(data: Omit<NewClient, "id" | "createdAt" | "updatedAt">): Promise<Client> {
  const result = await db.insert(clients).values(data).returning();
  return result[0];
}

export async function updateClient(
  id: string,
  data: Partial<Omit<NewClient, "id" | "createdAt">>
): Promise<Client | undefined> {
  const result = await db
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clients.id, id))
    .returning();
  return result[0];
}

export async function deleteClient(id: string): Promise<boolean> {
  const result = await db.delete(clients).where(eq(clients.id, id)).returning();
  return result.length > 0;
}

// ============= Agent Operations =============

export async function getAgents(): Promise<Agent[]> {
  return db.select().from(agents).orderBy(desc(agents.createdAt));
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  const result = await db.select().from(agents).where(eq(agents.id, id));
  return result[0];
}

export async function getAgentByClientId(clientId: string): Promise<Agent | undefined> {
  const result = await db.select().from(agents).where(eq(agents.clientId, clientId));
  return result[0];
}

export async function createAgent(clientId: string, clientName: string): Promise<Agent> {
  const result = await db
    .insert(agents)
    .values({ clientId, clientName })
    .returning();

  // Update client with agent ID
  await db
    .update(clients)
    .set({ agentId: result[0].id, updatedAt: new Date() })
    .where(eq(clients.id, clientId));

  return result[0];
}

export async function updateAgentStatus(
  id: string,
  status: Agent["status"]
): Promise<Agent | undefined> {
  const updateData: Partial<Agent> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "running") {
    updateData.lastRun = new Date();
  }

  const result = await db
    .update(agents)
    .set(updateData)
    .where(eq(agents.id, id))
    .returning();
  return result[0];
}

export async function incrementCreatorsAdded(id: string): Promise<Agent | undefined> {
  const agent = await getAgent(id);
  if (!agent) return undefined;

  const result = await db
    .update(agents)
    .set({
      creatorsAdded: agent.creatorsAdded + 1,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();
  return result[0];
}

export async function deleteAgent(id: string): Promise<boolean> {
  // Get agent to find client
  const agent = await getAgent(id);
  if (agent) {
    // Remove agent reference from client
    await db
      .update(clients)
      .set({ agentId: null, updatedAt: new Date() })
      .where(eq(clients.id, agent.clientId));
  }

  const result = await db.delete(agents).where(eq(agents.id, id)).returning();
  return result.length > 0;
}

export async function getAgentStats() {
  const allAgents = await getAgents();
  return {
    totalAgents: allAgents.length,
    runningAgents: allAgents.filter((a) => a.status === "running").length,
    idleAgents: allAgents.filter((a) => a.status === "idle").length,
    errorAgents: allAgents.filter((a) => a.status === "error").length,
    pausedAgents: allAgents.filter((a) => a.status === "paused").length,
    totalCreatorsAdded: allAgents.reduce((sum, a) => sum + a.creatorsAdded, 0),
  };
}

// ============= Agent Log Operations =============

export async function getAgentLogs(agentId: string): Promise<AgentLog[]> {
  return db
    .select()
    .from(agentLogs)
    .where(eq(agentLogs.agentId, agentId))
    .orderBy(desc(agentLogs.timestamp))
    .limit(100);
}

export async function addAgentLog(
  agentId: string,
  data: { action: string; result: "success" | "error" | "info"; details?: string }
): Promise<AgentLog> {
  const result = await db
    .insert(agentLogs)
    .values({ agentId, ...data })
    .returning();
  return result[0];
}

export async function getAgentLogCounts(): Promise<Record<string, number>> {
  const result = await db
    .select({
      agentId: agentLogs.agentId,
      count: count(),
    })
    .from(agentLogs)
    .groupBy(agentLogs.agentId);

  return result.reduce((acc, row) => {
    acc[row.agentId] = row.count;
    return acc;
  }, {} as Record<string, number>);
}

// ============= Tracked Creator Operations =============

export async function getCreators(clientId?: string): Promise<TrackedCreator[]> {
  if (clientId) {
    return db
      .select()
      .from(trackedCreators)
      .where(eq(trackedCreators.clientId, clientId))
      .orderBy(desc(trackedCreators.discoveredAt));
  }
  return db.select().from(trackedCreators).orderBy(desc(trackedCreators.discoveredAt));
}

export async function addCreator(
  data: Omit<TrackedCreator, "id" | "discoveredAt">
): Promise<TrackedCreator> {
  const result = await db.insert(trackedCreators).values(data).returning();
  return result[0];
}

export async function markCreatorAddedToImai(id: string): Promise<TrackedCreator | undefined> {
  const result = await db
    .update(trackedCreators)
    .set({ addedToImai: true, imaiAddedAt: new Date() })
    .where(eq(trackedCreators.id, id))
    .returning();
  return result[0];
}

export async function deleteCreator(id: string): Promise<boolean> {
  const result = await db
    .delete(trackedCreators)
    .where(eq(trackedCreators.id, id))
    .returning();
  return result.length > 0;
}

// ============= Export Operations =============

export async function exportCreatorsCSV(clientId?: string): Promise<string> {
  const creators = await getCreators(clientId);
  if (creators.length === 0) return "";

  const headers = [
    "Username",
    "Full Name",
    "Platform",
    "Source Type",
    "Source Value",
    "Discovered At",
    "Added to IMAI",
    "Likes",
    "Comments",
  ];

  const rows = creators.map((c) => [
    c.username,
    c.fullName || "",
    c.platform,
    c.sourceType,
    c.sourceValue,
    c.discoveredAt.toISOString(),
    c.addedToImai ? "Yes" : "No",
    c.engagement?.likes?.toString() || "",
    c.engagement?.comments?.toString() || "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join(
    "\n"
  );
}
