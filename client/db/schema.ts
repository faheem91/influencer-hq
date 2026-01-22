import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";

// Clients table
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logo: text("logo"),
  description: text("description"),

  // Tracking configuration stored as JSONB
  tracking: jsonb("tracking").$type<{
    instagram: { handle: string; hashtags: string[]; locations: string[] };
    facebook: { handle: string; hashtags: string[]; locations: string[] };
    tiktok: { handle: string; hashtags: string[] };
  }>().notNull(),

  // IMAI integration (credentials stored globally in settings)
  imaiCampaignId: text("imai_campaign_id"),

  // Agent config
  agentId: uuid("agent_id"),
  checkInterval: integer("check_interval").default(12).notNull(),
  lastChecked: timestamp("last_checked"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agents table
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  status: text("status").$type<"idle" | "running" | "error" | "paused">().default("idle").notNull(),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  creatorsAdded: integer("creators_added").default(0).notNull(),
  errors: jsonb("errors").$type<string[]>().default([]),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agent logs table
export const agentLogs = pgTable("agent_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  result: text("result").$type<"success" | "error" | "info">().notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Tracked creators table
export const trackedCreators = pgTable("tracked_creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  fullName: text("full_name"),
  profilePicUrl: text("profile_pic_url"),
  platform: text("platform").$type<"instagram" | "facebook" | "tiktok">().notNull(),
  sourceType: text("source_type").$type<"mention" | "hashtag" | "location" | "story">().notNull(),
  sourceValue: text("source_value").notNull(),
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
  addedToImai: boolean("added_to_imai").default(false).notNull(),
  imaiAddedAt: timestamp("imai_added_at"),
  postId: text("post_id"),
  postCaption: text("post_caption"),
  postMediaUrl: text("post_media_url"),
  engagement: jsonb("engagement").$type<{ likes: number; comments: number }>(),
});

// Settings table for global configuration (IMAI credentials, etc.)
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type exports for use in application
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentLog = typeof agentLogs.$inferSelect;
export type NewAgentLog = typeof agentLogs.$inferInsert;
export type TrackedCreator = typeof trackedCreators.$inferSelect;
export type NewTrackedCreator = typeof trackedCreators.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
