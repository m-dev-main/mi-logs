import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { MongoClient } from "mongodb";

export type DesktopSetupCheckId =
  | "authorKey"
  | "mongo"
  | "ownerPasskey"
  | "tor"
  | "workspace";

export type DesktopSetupCheckStatus = "ok" | "warning" | "error";

export type DesktopSetupCheck = Readonly<{
  id: DesktopSetupCheckId;
  label: string;
  status: DesktopSetupCheckStatus;
  detail: string;
}>;

export type DesktopSetupStatus = Readonly<{
  checkedAt: string;
  ready: boolean;
  torMode: "external";
  workspaceRoot: string;
  checks: DesktopSetupCheck[];
}>;

type DesktopSetupValidatorOptions = Readonly<{
  workspaceRoot: string;
}>;

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017";
const DEFAULT_MONGO_DB_NAME = "mi_log";
const SETUP_MONGO_TIMEOUT_MS = 1_500;

function configuredMongoUri(): string {
  return process.env.MONGO_URI?.trim() || DEFAULT_MONGO_URI;
}

function configuredMongoDbName(): string {
  return process.env.MONGO_DB_NAME?.trim() || DEFAULT_MONGO_DB_NAME;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function detectTorBinary(): Promise<string | null> {
  const configured =
    process.env.MI_LOG_TOR_BINARY_PATH?.trim() ||
    process.env.TOR_BINARY_PATH?.trim();
  const candidates = [
    configured,
    "/opt/homebrew/bin/tor",
    "/usr/local/bin/tor",
    "/usr/bin/tor",
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

function check(id: DesktopSetupCheckId, input: Omit<DesktopSetupCheck, "id">) {
  return {
    id,
    ...input,
  };
}

async function withMongo<T>(
  callback: (client: MongoClient) => Promise<T>,
): Promise<T> {
  const client = new MongoClient(configuredMongoUri(), {
    serverSelectionTimeoutMS: SETUP_MONGO_TIMEOUT_MS,
  });

  try {
    await client.connect();
    return await callback(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

export class DesktopSetupValidator {
  private readonly workspaceRoot: string;

  constructor(options: DesktopSetupValidatorOptions) {
    this.workspaceRoot = options.workspaceRoot;
  }

  async validate(): Promise<DesktopSetupStatus> {
    const checks = await Promise.all([
      this.validateWorkspace(),
      this.validateMongo(),
      this.validateOwnerPasskey(),
      this.validateAuthorKey(),
      this.validateTor(),
    ]);

    return {
      checkedAt: nowIso(),
      checks,
      ready: checks.every((item) => item.status === "ok"),
      torMode: "external",
      workspaceRoot: this.workspaceRoot,
    };
  }

  private async validateWorkspace(): Promise<DesktopSetupCheck> {
    const requiredPaths = [
      "pnpm-workspace.yaml",
      "package.json",
      "apps/api/package.json",
    ];

    const missing = [];
    for (const relativePath of requiredPaths) {
      if (!(await exists(join(this.workspaceRoot, relativePath)))) {
        missing.push(relativePath);
      }
    }

    if (missing.length > 0) {
      return check("workspace", {
        detail: `Missing ${missing.join(", ")}. Build web or set MI_LOG_WORKSPACE_ROOT to the mi-log checkout.`,
        label: "Workspace",
        status: "error",
      });
    }

    return check("workspace", {
      detail: this.workspaceRoot,
      label: "Workspace",
      status: "ok",
    });
  }

  private async validateMongo(): Promise<DesktopSetupCheck> {
    try {
      await withMongo((client) =>
        client.db(configuredMongoDbName()).command({ ping: 1 }),
      );
      return check("mongo", {
        detail: `${configuredMongoUri()} / ${configuredMongoDbName()}`,
        label: "MongoDB",
        status: "ok",
      });
    } catch (error) {
      return check("mongo", {
        detail: error instanceof Error ? error.message : "MongoDB ping failed.",
        label: "MongoDB",
        status: "error",
      });
    }
  }

  private async validateOwnerPasskey(): Promise<DesktopSetupCheck> {
    try {
      const count = await withMongo((client) =>
        client
          .db(configuredMongoDbName())
          .collection("owner_credentials")
          .countDocuments({ credentialId: { $exists: true } }, { limit: 1 }),
      );

      if (count > 0) {
        return check("ownerPasskey", {
          detail: "Owner passkey is registered.",
          label: "Owner passkey",
          status: "ok",
        });
      }

      return check("ownerPasskey", {
        detail: "No owner passkey is registered yet.",
        label: "Owner passkey",
        status: "warning",
      });
    } catch (error) {
      return check("ownerPasskey", {
        detail:
          error instanceof Error
            ? error.message
            : "Owner passkey state could not be read.",
        label: "Owner passkey",
        status: "error",
      });
    }
  }

  private async validateAuthorKey(): Promise<DesktopSetupCheck> {
    const privateKeyPath = resolve(
      this.workspaceRoot,
      process.env.AUTHOR_KEY_DIR?.trim() || "keys/private",
      "author.key",
    );
    const publicKeyPath = resolve(
      this.workspaceRoot,
      process.env.AUTHOR_PUBLIC_KEY_PATH?.trim() || "keys/author.pub",
    );

    const [hasPrivateKey, hasPublicKey] = await Promise.all([
      exists(privateKeyPath),
      exists(publicKeyPath),
    ]);

    if (hasPrivateKey && hasPublicKey) {
      return check("authorKey", {
        detail: "Author private and public key files are present.",
        label: "Author key",
        status: "ok",
      });
    }

    return check("authorKey", {
      detail: `Missing ${[
        hasPrivateKey ? null : privateKeyPath,
        hasPublicKey ? null : publicKeyPath,
      ]
        .filter(Boolean)
        .join(", ")}.`,
      label: "Author key",
      status: "warning",
    });
  }

  private async validateTor(): Promise<DesktopSetupCheck> {
    const torBinary = await detectTorBinary();
    if (!torBinary) {
      return check("tor", {
        detail:
          "External Tor binary not found. Set MI_LOG_TOR_BINARY_PATH or install Tor.",
        label: "Tor",
        status: "error",
      });
    }

    return check("tor", {
      detail: `External Tor binary: ${torBinary}`,
      label: "Tor",
      status: "ok",
    });
  }
}
