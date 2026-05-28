import { config } from "./config/env.js";
import { ensureMongoIndexes } from "./db/indexes.js";
import { closeMongo, connectMongo } from "./db/mongo.js";
import { mkdir, rm } from "node:fs/promises";
import type { Express } from "express";
import type { Server } from "node:http";
import { dirname } from "node:path";
import {
  registerGracefulShutdown,
  registerShutdownCleanup,
} from "./runtime/shutdown.js";
import { createServer } from "./server/createServer.js";

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function startDesktopSocketServer(app: Express): Promise<Server | null> {
  const socketPath = config.DESKTOP_ADMIN_SOCKET_PATH;
  if (!socketPath) {
    return null;
  }

  await mkdir(dirname(socketPath), { recursive: true });
  await rm(socketPath, { force: true });

  const socketServer = app.listen(socketPath, () => {
    console.log(`[mi-log-api] desktop admin socket listening at ${socketPath}`);
  });

  socketServer.on("error", (err: NodeJS.ErrnoException) => {
    const message = err.message ?? "desktop socket listen failed";
    console.error(`[mi-log-api] desktop socket failed: ${message}`);
    void closeMongo().finally(() => process.exit(1));
  });

  registerShutdownCleanup(async () => {
    await closeServer(socketServer);
    await rm(socketPath, { force: true });
  });

  return socketServer;
}

try {
  await connectMongo();
} catch {
  process.exit(1);
}

try {
  await ensureMongoIndexes();
} catch {
  process.exit(1);
}

registerShutdownCleanup(() => closeMongo());

const app = createServer();
await startDesktopSocketServer(app);

const server = app.listen(config.API_PORT, config.API_HOST, () => {
  console.log(
    `[mi-log-api] listening on http://${config.API_HOST}:${config.API_PORT}`,
  );
  registerGracefulShutdown(server);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  const message = err.message ?? "listen failed";
  console.error(`Server failed to start: ${message}`);
  void closeMongo().finally(() => process.exit(1));
});
