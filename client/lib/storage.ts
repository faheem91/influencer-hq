import { Client, ClientFormData } from "@/types/client";
import { Agent, AgentLog, AgentStats } from "@/types/agent";
import { TrackedCreator } from "@/types/instagram";

// In-memory storage with localStorage persistence
class Storage {
  private clients: Map<string, Client> = new Map();
  private agents: Map<string, Agent> = new Map();
  private creators: Map<string, TrackedCreator> = new Map();
  private initialized = false;

  private initialize() {
    if (this.initialized || typeof window === "undefined") return;

    try {
      const clientsData = localStorage.getItem("influencerHQ_clients");
      const agentsData = localStorage.getItem("influencerHQ_agents");
      const creatorsData = localStorage.getItem("influencerHQ_creators");

      if (clientsData) {
        const parsed = JSON.parse(clientsData);
        Object.entries(parsed).forEach(([id, client]) => {
          this.clients.set(id, client as Client);
        });
      }

      if (agentsData) {
        const parsed = JSON.parse(agentsData);
        Object.entries(parsed).forEach(([id, agent]) => {
          this.agents.set(id, agent as Agent);
        });
      }

      if (creatorsData) {
        const parsed = JSON.parse(creatorsData);
        Object.entries(parsed).forEach(([id, creator]) => {
          this.creators.set(id, creator as TrackedCreator);
        });
      }
    } catch (error) {
      console.error("Error initializing storage:", error);
    }

    this.initialized = true;
  }

  private persist() {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      "influencerHQ_clients",
      JSON.stringify(Object.fromEntries(this.clients))
    );
    localStorage.setItem(
      "influencerHQ_agents",
      JSON.stringify(Object.fromEntries(this.agents))
    );
    localStorage.setItem(
      "influencerHQ_creators",
      JSON.stringify(Object.fromEntries(this.creators))
    );
  }

  // Client methods
  getClients(): Client[] {
    this.initialize();
    return Array.from(this.clients.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getClient(id: string): Client | undefined {
    this.initialize();
    return this.clients.get(id);
  }

  createClient(data: ClientFormData): Client {
    this.initialize();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const client: Client = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.clients.set(id, client);
    this.persist();
    return client;
  }

  updateClient(id: string, data: Partial<ClientFormData>): Client | undefined {
    this.initialize();
    const existing = this.clients.get(id);
    if (!existing) return undefined;

    const updated: Client = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.clients.set(id, updated);
    this.persist();
    return updated;
  }

  deleteClient(id: string): boolean {
    this.initialize();
    const deleted = this.clients.delete(id);
    if (deleted) {
      // Also delete associated agents and creators
      for (const [agentId, agent] of this.agents) {
        if (agent.clientId === id) {
          this.agents.delete(agentId);
        }
      }
      for (const [creatorId, creator] of this.creators) {
        if (creator.clientId === id) {
          this.creators.delete(creatorId);
        }
      }
      this.persist();
    }
    return deleted;
  }

  // Agent methods
  getAgents(): Agent[] {
    this.initialize();
    return Array.from(this.agents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getAgent(id: string): Agent | undefined {
    this.initialize();
    return this.agents.get(id);
  }

  getAgentByClientId(clientId: string): Agent | undefined {
    this.initialize();
    return Array.from(this.agents.values()).find(a => a.clientId === clientId);
  }

  createAgent(clientId: string, clientName: string): Agent {
    this.initialize();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const agent: Agent = {
      id,
      clientId,
      clientName,
      status: "idle",
      logs: [],
      creatorsAdded: 0,
      errors: [],
      createdAt: now,
      updatedAt: now,
    };
    this.agents.set(id, agent);

    // Update client with agent ID
    const client = this.clients.get(clientId);
    if (client) {
      client.agentId = id;
      this.clients.set(clientId, client);
    }

    this.persist();
    return agent;
  }

  updateAgentStatus(id: string, status: Agent["status"]): Agent | undefined {
    this.initialize();
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    agent.status = status;
    agent.updatedAt = new Date().toISOString();
    if (status === "running") {
      agent.lastRun = agent.updatedAt;
    }
    this.agents.set(id, agent);
    this.persist();
    return agent;
  }

  addAgentLog(id: string, log: Omit<AgentLog, "id" | "timestamp">): Agent | undefined {
    this.initialize();
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const newLog: AgentLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    agent.logs.unshift(newLog);
    agent.logs = agent.logs.slice(0, 100); // Keep only last 100 logs
    agent.updatedAt = new Date().toISOString();
    this.agents.set(id, agent);
    this.persist();
    return agent;
  }

  incrementCreatorsAdded(id: string): Agent | undefined {
    this.initialize();
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    agent.creatorsAdded += 1;
    agent.updatedAt = new Date().toISOString();
    this.agents.set(id, agent);
    this.persist();
    return agent;
  }

  deleteAgent(id: string): boolean {
    this.initialize();
    const agent = this.agents.get(id);
    if (agent) {
      // Remove agent reference from client
      const client = this.clients.get(agent.clientId);
      if (client) {
        client.agentId = undefined;
        this.clients.set(agent.clientId, client);
      }
    }
    const deleted = this.agents.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  getAgentStats(): AgentStats {
    this.initialize();
    const agents = Array.from(this.agents.values());
    return {
      totalAgents: agents.length,
      runningAgents: agents.filter(a => a.status === "running").length,
      idleAgents: agents.filter(a => a.status === "idle").length,
      errorAgents: agents.filter(a => a.status === "error").length,
      pausedAgents: agents.filter(a => a.status === "paused").length,
      totalCreatorsAdded: agents.reduce((sum, a) => sum + a.creatorsAdded, 0),
    };
  }

  // Creator methods
  getCreators(clientId?: string): TrackedCreator[] {
    this.initialize();
    let creators = Array.from(this.creators.values());
    if (clientId) {
      creators = creators.filter(c => c.clientId === clientId);
    }
    return creators.sort(
      (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime()
    );
  }

  addCreator(creator: Omit<TrackedCreator, "id" | "discoveredAt">): TrackedCreator {
    this.initialize();
    const id = crypto.randomUUID();
    const newCreator: TrackedCreator = {
      ...creator,
      id,
      discoveredAt: new Date().toISOString(),
    };
    this.creators.set(id, newCreator);
    this.persist();
    return newCreator;
  }

  markCreatorAddedToImai(id: string): TrackedCreator | undefined {
    this.initialize();
    const creator = this.creators.get(id);
    if (!creator) return undefined;

    creator.addedToImai = true;
    creator.imaiAddedAt = new Date().toISOString();
    this.creators.set(id, creator);
    this.persist();
    return creator;
  }

  deleteCreator(id: string): boolean {
    this.initialize();
    const deleted = this.creators.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  // Export methods
  exportClients(): string {
    this.initialize();
    return JSON.stringify(this.getClients(), null, 2);
  }

  exportCreators(clientId?: string): string {
    this.initialize();
    return JSON.stringify(this.getCreators(clientId), null, 2);
  }

  exportCreatorsCSV(clientId?: string): string {
    this.initialize();
    const creators = this.getCreators(clientId);
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

    const rows = creators.map(c => [
      c.username,
      c.fullName || "",
      c.platform,
      c.sourceType,
      c.sourceValue,
      c.discoveredAt,
      c.addedToImai ? "Yes" : "No",
      c.engagement?.likes?.toString() || "",
      c.engagement?.comments?.toString() || "",
    ]);

    return [
      headers.join(","),
      ...rows.map(r => r.map(v => `"${v}"`).join(",")),
    ].join("\n");
  }
}

export const storage = new Storage();
