import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon database
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// Configure Neon for better connection handling
neonConfig.pipelineConnect = false;
neonConfig.useSecureWebSocket = true;
neonConfig.poolQueryViaFetch = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increase timeout to 10 seconds
});

export const db = drizzle({ client: pool, schema });