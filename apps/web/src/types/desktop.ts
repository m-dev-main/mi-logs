export type RuntimeServiceName = "api" | "static" | "tor";

export type RuntimeServiceState =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "exited"
  | "failed";

export type RuntimeHealth = Readonly<{
  checkedAt: string;
  ok: boolean;
  statusCode?: number;
  error?: string;
}>;

export type RuntimeServiceStatus = Readonly<{
  name: RuntimeServiceName;
  label: string;
  state: RuntimeServiceState;
  health: RuntimeHealth | null;
  pid: number | null;
  pidPath: string;
  logPath: string;
  startedAt: string | null;
  stoppedAt: string | null;
  exitCode: number | null;
  signal: string | null;
  onionHostname: string | null;
  lastError: string | null;
}>;

export type StaleProcessRecord = Readonly<{
  name: RuntimeServiceName;
  pid: number;
  pidPath: string;
  state: "removed" | "still-running";
}>;

export type RuntimeStatus = Readonly<{
  appDataPath: string;
  logsDir: string;
  processesDir: string;
  socketsDir: string;
  desktopAdminSocketPath: string;
  workspaceRoot: string;
  staleProcessRecords: StaleProcessRecord[];
  services: Record<RuntimeServiceName, RuntimeServiceStatus>;
}>;

export type DesktopStatus = Readonly<{
  appDataPath: string;
  isPackaged: boolean;
  platform: string;
  renderer: "dev-server" | "web-build";
  runtime: RuntimeStatus;
  versions: Readonly<{
    chrome: string;
    electron: string;
    node: string;
  }>;
}>;

export type DesktopAdminProxyRequest = Readonly<{
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}>;

export type DesktopAdminProxyResponse = Readonly<{
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: unknown;
}>;

export type DesktopLockStatus = Readonly<{
  available: boolean;
  locked: boolean;
  unlockedAt: string | null;
  lastActivityAt: string | null;
  lockedAt: string;
  idleTimeoutMs: number;
  reason: string | null;
}>;

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
  signal: string | null;
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

export type MiLogDesktopApi = Readonly<{
  getStatus: () => Promise<DesktopStatus>;
  admin: Readonly<{
    request: (
      input: DesktopAdminProxyRequest,
    ) => Promise<DesktopAdminProxyResponse>;
  }>;
  lock: Readonly<{
    getStatus: () => Promise<DesktopLockStatus>;
    lock: (reason?: string) => Promise<DesktopLockStatus>;
    recordActivity: () => Promise<DesktopLockStatus>;
    requireBiometric: (reason: string) => Promise<DesktopLockStatus>;
    unlock: (reason?: string) => Promise<DesktopLockStatus>;
  }>;
  openExternal: (url: string) => Promise<void>;
  setup: Readonly<{
    validate: () => Promise<DesktopSetupStatus>;
  }>;
  release: Readonly<{
    proofSummary: () => Promise<ReleaseProofSummary>;
    restartStaticServer: () => Promise<RuntimeStatus>;
    run: (commandName: ReleaseCommandName) => Promise<ReleaseCommandResult>;
  }>;
  runtime: Readonly<{
    getStatus: () => Promise<RuntimeStatus>;
    getLog: (name: RuntimeServiceName) => Promise<string>;
    refreshHealth: () => Promise<RuntimeStatus>;
    start: () => Promise<RuntimeStatus>;
    stop: () => Promise<RuntimeStatus>;
  }>;
}>;

declare global {
  interface Window {
    miLogDesktop?: MiLogDesktopApi;
  }
}
