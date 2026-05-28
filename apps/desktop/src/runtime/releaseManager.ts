import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DesktopServiceManager } from "./serviceManager";

export type ReleaseCommandName =
  | "addIpfsRelease"
  | "auditRelease"
  | "auditRuntime"
  | "auditSource"
  | "buildWeb"
  | "exportRelease"
  | "generateAuthorKey";

export type ReleaseCommandResult = Readonly<{
  command: ReleaseCommandName;
  ok: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
  startedAt: string;
  finishedAt: string;
}>;

export type ReleaseProofSummary = Readonly<{
  authorPublicKey: string | null;
  ipfsCid: string | null;
  manifestGeneratedAt: string | null;
  publishedPostCount: number | null;
  releaseSha256: string | null;
  onionUrl: string | null;
}>;

type DesktopReleaseManagerOptions = Readonly<{
  serviceManager: DesktopServiceManager;
  workspaceRoot: string;
}>;

type CommandConfig = Readonly<{
  command: ReleaseCommandName;
  args: string[];
}>;

const MAX_OUTPUT_CHARS = 16_000;

export const RELEASE_COMMAND_NAMES: readonly ReleaseCommandName[] = [
  "addIpfsRelease",
  "auditRelease",
  "auditRuntime",
  "auditSource",
  "buildWeb",
  "exportRelease",
  "generateAuthorKey",
];

const COMMANDS: Record<ReleaseCommandName, CommandConfig> = {
  addIpfsRelease: {
    command: "addIpfsRelease",
    args: ["ipfs:add-release"],
  },
  auditRelease: {
    command: "auditRelease",
    args: ["audit:release"],
  },
  auditRuntime: {
    command: "auditRuntime",
    args: ["audit:runtime"],
  },
  auditSource: {
    command: "auditSource",
    args: ["audit:source"],
  },
  buildWeb: {
    command: "buildWeb",
    args: ["build:web"],
  },
  exportRelease: {
    command: "exportRelease",
    args: ["release"],
  },
  generateAuthorKey: {
    command: "generateAuthorKey",
    args: ["generate:author-key"],
  },
};

function nowIso(): string {
  return new Date().toISOString();
}

function trimOutput(value: string): string {
  if (value.length <= MAX_OUTPUT_CHARS) {
    return value;
  }

  return value.slice(value.length - MAX_OUTPUT_CHARS);
}

function normalizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class DesktopReleaseManager {
  private readonly serviceManager: DesktopServiceManager;
  private readonly workspaceRoot: string;

  constructor(options: DesktopReleaseManagerOptions) {
    this.serviceManager = options.serviceManager;
    this.workspaceRoot = options.workspaceRoot;
  }

  async run(commandName: ReleaseCommandName): Promise<ReleaseCommandResult> {
    if (!RELEASE_COMMAND_NAMES.includes(commandName)) {
      throw new Error("Unknown desktop release command.");
    }

    const config = COMMANDS[commandName];
    const startedAt = nowIso();

    return await new Promise<ReleaseCommandResult>((resolve, reject) => {
      const child = spawn("pnpm", config.args, {
        cwd: this.workspaceRoot,
        env: {
          ...process.env,
          API_HOST: process.env.API_HOST ?? "127.0.0.1",
          STATIC_HOST: process.env.STATIC_HOST ?? "127.0.0.1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      child.stdin.end();

      let output = "";
      const append = (chunk: Buffer): void => {
        output = trimOutput(output + chunk.toString("utf8"));
      };

      child.stdout.on("data", append);
      child.stderr.on("data", append);
      child.on("error", reject);
      child.on("exit", (exitCode, signal) => {
        resolve({
          command: commandName,
          ok: exitCode === 0,
          exitCode,
          signal,
          output: trimOutput(output).trim(),
          startedAt,
          finishedAt: nowIso(),
        });
      });
    });
  }

  async restartStaticServer() {
    await this.serviceManager.stopService("static");
    await this.serviceManager.startService("static");
    return await this.serviceManager.refreshHealth();
  }

  async proofSummary(): Promise<ReleaseProofSummary> {
    const releaseRoot = join(this.workspaceRoot, "releases", "latest");
    const manifestPath = join(releaseRoot, "sovereign-manifest.json");
    const releaseAuthorPublicKeyPath = join(releaseRoot, "author.pub");
    const authorPublicKeyPath = join(this.workspaceRoot, "keys", "author.pub");
    const ipfsCidPath = join(releaseRoot, "ipfs-cid.txt");
    const releaseSha256Path = join(releaseRoot, "release-sha256.txt");

    const [manifestRaw, authorPublicKeyRaw, ipfsCidRaw, releaseSha256Raw] = await Promise.all([
      readFile(manifestPath, "utf8").catch(() => null),
      readFile(releaseAuthorPublicKeyPath, "utf8").catch(() =>
        readFile(authorPublicKeyPath, "utf8").catch(() => null),
      ),
      readFile(ipfsCidPath, "utf8").catch(() => null),
      readFile(releaseSha256Path, "utf8").catch(() => null),
    ]);

    let manifestGeneratedAt: string | null = null;
    let publishedPostCount: number | null = null;
    if (manifestRaw) {
      try {
        const manifest = JSON.parse(manifestRaw) as {
          generatedAt?: unknown;
          posts?: unknown;
        };
        manifestGeneratedAt =
          typeof manifest.generatedAt === "string" ? manifest.generatedAt : null;
        publishedPostCount = Array.isArray(manifest.posts)
          ? manifest.posts.length
          : null;
      } catch {
        manifestGeneratedAt = null;
        publishedPostCount = null;
      }
    }

    const onionHostname = this.serviceManager.getStatus().services.tor.onionHostname;

    return {
      authorPublicKey: authorPublicKeyRaw ? normalizeText(authorPublicKeyRaw) : null,
      ipfsCid: ipfsCidRaw ? normalizeText(ipfsCidRaw) : null,
      manifestGeneratedAt,
      onionUrl: onionHostname ? `http://${onionHostname}` : null,
      publishedPostCount,
      releaseSha256: releaseSha256Raw ? normalizeText(releaseSha256Raw) : null,
    };
  }
}
