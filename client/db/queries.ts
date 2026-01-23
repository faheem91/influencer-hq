"use server";

import { db } from "./index";
import {
  clients,
  agents,
  agentLogs,
  trackedCreators,
  settings,
  Client,
  NewClient,
  Agent,
  NewAgent,
  AgentLog,
  TrackedCreator,
  Setting,
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

// ============= Settings Operations =============

export async function getSetting(key: string): Promise<string | null> {
  const result = await db.select().from(settings).where(eq(settings.key, key));
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<Setting> {
  // Try to update existing setting, or insert new one
  const existing = await db.select().from(settings).where(eq(settings.key, key));

  if (existing.length > 0) {
    const result = await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();
    return result[0];
  } else {
    const result = await db
      .insert(settings)
      .values({ key, value })
      .returning();
    return result[0];
  }
}

export async function getSettings(): Promise<Setting[]> {
  return db.select().from(settings);
}

export async function getImaiCredentials(): Promise<{ email: string; password: string } | null> {
  const email = await getSetting("imai_email");
  const password = await getSetting("imai_password");

  if (email && password) {
    return { email, password };
  }
  return null;
}

export async function setImaiCredentials(email: string, password: string): Promise<void> {
  await setSetting("imai_email", email);
  await setSetting("imai_password", password);
}

// ============= Creator Discovery =============

interface InstagramPost {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  permalink: string;
  timestamp: string;
  creator: {
    username: string;
    fullName: string;
    profilePicUrl: string | null;
  };
  engagement: {
    likes: number;
    comments: number;
  };
  source: {
    type: string;
    value: string;
  };
}

export async function discoverCreators(
  clientId: string,
  hashtags: string[]
): Promise<{ discovered: number; errors: string[] }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const errors: string[] = [];
  let totalDiscovered = 0;

  for (const hashtag of hashtags) {
    try {
      const cleanTag = hashtag.replace(/^#/, "");
      console.log(`Searching for hashtag: #${cleanTag}`);

      const response = await fetch(
        `${apiUrl}/api/instagram/search?keyword=%23${encodeURIComponent(cleanTag)}&limit=50`
      );

      if (!response.ok) {
        errors.push(`Failed to search #${cleanTag}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();

      if (!data.success || !data.data?.posts) {
        errors.push(`No results for #${cleanTag}`);
        continue;
      }

      // Get existing creators to avoid duplicates
      const existingCreators = await getCreators(clientId);
      const existingUsernames = new Set(existingCreators.map((c) => c.username.toLowerCase()));

      for (const post of data.data.posts as InstagramPost[]) {
        const username = post.creator?.username || "unknown";

        // Skip if already tracked
        if (existingUsernames.has(username.toLowerCase())) {
          continue;
        }

        // Add creator
        await addCreator({
          clientId,
          username,
          fullName: post.creator?.fullName || null,
          profilePicUrl: post.creator?.profilePicUrl || null,
          platform: "instagram",
          sourceType: "hashtag",
          sourceValue: `#${cleanTag}`,
          postId: post.id,
          postCaption: post.caption || null,
          postMediaUrl: post.mediaUrl || null,
          engagement: post.engagement,
          addedToImai: false,
          imaiAddedAt: null,
        });

        existingUsernames.add(username.toLowerCase());
        totalDiscovered++;
      }
    } catch (error) {
      errors.push(`Error searching #${hashtag}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { discovered: totalDiscovered, errors };
}
