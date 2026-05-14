import type { Server } from "node:http";

const SHUTDOWN_FORCE_MS = 10_000;

let shutdownInProgress = false;

const cleanups: Array<() => Promise<void>> = [];

/** Register async work to run after the HTTP server has stopped accepting connections. */
export function registerShutdownCleanup(fn: () => Promise<void>): void {
  cleanups.push(fn);
}

async function runCleanups(): Promise<void> {
  for (const fn of cleanups) {
    await fn();
  }
}

/**
 * Register one-shot graceful shutdown for SIGINT / SIGTERM.
 * Call only after the HTTP server has started listening.
 */
export function registerGracefulShutdown(server: Server): void {
  const beginShutdown = (signal: NodeJS.Signals): void => {
    if (shutdownInProgress) {
      return;
    }
    shutdownInProgress = true;

    console.log(`[mi-log-api] received ${signal}`);
    console.log("[mi-log-api] shutting down gracefully");

    const forceExit = setTimeout(() => {
      console.error("[mi-log-api] shutdown timed out");
      process.exit(1);
    }, SHUTDOWN_FORCE_MS);

    void (async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
      } catch {
        clearTimeout(forceExit);
        console.error("[mi-log-api] error during shutdown");
        process.exit(1);
        return;
      }

      try {
        await runCleanups();
      } catch {
        clearTimeout(forceExit);
        console.error("[mi-log-api] error during shutdown");
        process.exit(1);
        return;
      }

      clearTimeout(forceExit);
      console.log("[mi-log-api] shutdown complete");
      process.exit(0);
    })();
  };

  process.on("SIGINT", () => beginShutdown("SIGINT"));
  process.on("SIGTERM", () => beginShutdown("SIGTERM"));
}
