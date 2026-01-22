import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import * as schema from "./schema";

// Create database instance
export const db = drizzle(sql, { schema });

// Re-export schema
export * from "./schema";
