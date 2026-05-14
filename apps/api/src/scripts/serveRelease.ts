import { constants } from "node:fs";
import { access, copyFile } from "node:fs/promises";
import type { Server } from "node:http";
import { dirname, join, resolve } from "node:path";
import { config } from "../config/env.js";
import { createStaticServer } from "../server/createStaticServer.js";

const PUBLIC_PROOF_FILES = [
  "sovereign-manifest.json",
  "sovereign-manifest.sig",
  "author.pub",
  "release-sha256.txt",
] as const;

function resolveFromWorkspace(path: string): string {
  return resolve(process.env.INIT_CWD ?? process.cwd(), path);
}

async function assertReadableDirectory(path: string): Promise<void> {
  try {
    await access(path, constants.R_OK);
  } catch {
    throw new Error("Static release directory is not readable; run pnpm release first.");
  }
}

async function assertReadableFile(path: string): Promise<void> {
  try {
    await access(path, constants.R_OK);
  } catch {
    throw new Error("Static release index is not readable; run pnpm release first.");
  }
}

async function copyPublicProofFiles(staticReleaseDir: string): Promise<void> {
  const releaseRoot = dirname(staticReleaseDir);

  await Promise.all(
    PUBLIC_PROOF_FILES.map(async (fileName) => {
      const source = join(releaseRoot, fileName);
      const target = join(staticReleaseDir, fileName);

      try {
        await access(source, constants.R_OK);
      } catch {
        return;
      }

      await copyFile(source, target);
    }),
  );
}

function registerStaticShutdown(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`[mi-log-static] received ${signal}`);

    server.close((error) => {
      if (error) {
        console.error("[mi-log-static] shutdown failed");
        process.exit(1);
        return;
      }

      console.log("[mi-log-static] shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

try {
  const staticReleaseDir = resolveFromWorkspace(config.STATIC_RELEASE_DIR);
  await assertReadableDirectory(staticReleaseDir);
  await assertReadableFile(join(staticReleaseDir, "index.html"));
  await copyPublicProofFiles(staticReleaseDir);

  const app = createStaticServer(staticReleaseDir);
  const server = app.listen(config.STATIC_PORT, config.STATIC_HOST, () => {
    console.log(
      `[mi-log-static] serving readonly release at http://${config.STATIC_HOST}:${config.STATIC_PORT}`,
    );
    registerStaticShutdown(server);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    console.error(`[mi-log-static] failed to start: ${error.message}`);
    process.exit(1);
  });
} catch (error) {
  const message = error instanceof Error ? error.message : "Static release failed.";
  console.error(`[mi-log-static] ${message}`);
  process.exit(1);
}
