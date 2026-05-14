import { MongoClient, type Db } from "mongodb";
import { config } from "../config/env.js";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Singleton connect. Idempotent if already connected.
 */
export async function connectMongo(): Promise<void> {
  if (client && db) {
    return;
  }

  try {
    client = new MongoClient(config.MONGO_URI, {
      serverSelectionTimeoutMS: 5_000,
    });
    await client.connect();
    db = client.db(config.MONGO_DB_NAME);
    console.log("[mi-log-api] MongoDB connected");
  } catch {
    client = null;
    db = null;
    console.error("[mi-log-api] MongoDB connection failed");
    throw new Error("MongoDB connection failed");
  }
}

/**
 * Close client if connected. Idempotent.
 */
export async function closeMongo(): Promise<void> {
  if (!client) {
    return;
  }

  try {
    await client.close();
    console.log("[mi-log-api] MongoDB disconnected");
  } catch {
    console.error("[mi-log-api] MongoDB disconnect error");
  } finally {
    client = null;
    db = null;
  }
}

export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB not connected; call connectMongo() first");
  }
  return db;
}

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error("MongoDB not connected; call connectMongo() first");
  }
  return client;
}

export type MongoHealth = {
  connected: boolean;
};

/** In-memory connection state only; no I/O (no ping). */
export function getMongoHealth(): MongoHealth {
  return {
    connected: client !== null && db !== null,
  };
}
