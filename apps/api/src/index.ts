import { config } from "./config/env.js";
import { ensureMongoIndexes } from "./db/indexes.js";
import { closeMongo, connectMongo } from "./db/mongo.js";
import {
  registerGracefulShutdown,
  registerShutdownCleanup,
} from "./runtime/shutdown.js";
import { createServer } from "./server/createServer.js";

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
