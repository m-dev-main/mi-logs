import { contextBridge, ipcRenderer } from "electron";

type RuntimeServiceName = "api" | "static" | "tor";

type RuntimeServiceState =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "exited"
  | "failed";

type RuntimeHealth = Readonly<{
  checkedAt: string;
  ok: boolean;
  statusCode?: number;
  error?: string;
}>;

type RuntimeServiceStatus = Readonly<{
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
  signal: NodeJS.Signals | null;
  onionHostname: string | null;
  lastError: string | null;
}>;

type StaleProcessRecord = Readonly<{
  name: RuntimeServiceName;
  pid: number;
  pidPath: string;
  state: "removed" | "still-running";
}>;

type RuntimeStatus = Readonly<{
  appDataPath: string;
  logsDir: string;
  processesDir: string;
  socketsDir: string;
  desktopAdminSocketPath: string;
  workspaceRoot: string;
  staleProcessRecords: StaleProcessRecord[];
  services: Record<RuntimeServiceName, RuntimeServiceStatus>;
}>;

type DesktopAdminProxyRequest = Readonly<{
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}>;

type DesktopAdminProxyResponse = Readonly<{
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: unknown;
}>;

type DesktopLockStatus = Readonly<{
  available: boolean;
  locked: boolean;
  unlockedAt: string | null;
  lastActivityAt: string | null;
  lockedAt: string;
  idleTimeoutMs: number;
  reason: string | null;
}>;

type DesktopSetupCheckId =
  | "authorKey"
  | "mongo"
  | "ownerPasskey"
  | "tor"
  | "workspace";

type DesktopSetupCheckStatus = "ok" | "warning" | "error";

type DesktopSetupCheck = Readonly<{
  id: DesktopSetupCheckId;
  label: string;
  status: DesktopSetupCheckStatus;
  detail: string;
}>;

type DesktopSetupStatus = Readonly<{
  checkedAt: string;
  ready: boolean;
  torMode: "external";
  workspaceRoot: string;
  checks: DesktopSetupCheck[];
}>;

type ReleaseCommandName =
  | "addIpfsRelease"
  | "auditRelease"
  | "auditRuntime"
  | "auditSource"
  | "buildWeb"
  | "exportRelease"
  | "generateAuthorKey";

type ReleaseCommandResult = Readonly<{
  command: ReleaseCommandName;
  ok: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
  startedAt: string;
  finishedAt: string;
}>;

type ReleaseProofSummary = Readonly<{
  authorPublicKey: string | null;
  ipfsCid: string | null;
  manifestGeneratedAt: string | null;
  publishedPostCount: number | null;
  releaseSha256: string | null;
  onionUrl: string | null;
}>;

type DesktopStatus = Readonly<{
  appDataPath: string;
  isPackaged: boolean;
  platform: NodeJS.Platform;
  renderer: "dev-server" | "web-build";
  runtime: RuntimeStatus;
  versions: Readonly<{
    chrome: string;
    electron: string;
    node: string;
  }>;
}>;

type MiLogDesktopApi = Readonly<{
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

const api: MiLogDesktopApi = {
  getStatus: () => ipcRenderer.invoke("desktop:getStatus") as Promise<DesktopStatus>,
  admin: {
    request: (input) =>
      ipcRenderer.invoke("admin:request", input) as Promise<DesktopAdminProxyResponse>,
  },
  lock: {
    getStatus: () => ipcRenderer.invoke("lock:getStatus") as Promise<DesktopLockStatus>,
    lock: (reason) =>
      ipcRenderer.invoke("lock:lock", reason) as Promise<DesktopLockStatus>,
    recordActivity: () =>
      ipcRenderer.invoke("lock:recordActivity") as Promise<DesktopLockStatus>,
    requireBiometric: (reason) =>
      ipcRenderer.invoke("lock:requireBiometric", reason) as Promise<DesktopLockStatus>,
    unlock: (reason) =>
      ipcRenderer.invoke("lock:unlock", reason) as Promise<DesktopLockStatus>,
  },
  openExternal: (url) => ipcRenderer.invoke("desktop:openExternal", url) as Promise<void>,
  setup: {
    validate: () =>
      ipcRenderer.invoke("setup:validate") as Promise<DesktopSetupStatus>,
  },
  release: {
    proofSummary: () =>
      ipcRenderer.invoke("release:proofSummary") as Promise<ReleaseProofSummary>,
    restartStaticServer: () =>
      ipcRenderer.invoke("release:restartStatic") as Promise<RuntimeStatus>,
    run: (commandName) =>
      ipcRenderer.invoke(
        "release:run",
        commandName,
      ) as Promise<ReleaseCommandResult>,
  },
  runtime: {
    getStatus: () => ipcRenderer.invoke("runtime:getStatus") as Promise<RuntimeStatus>,
    getLog: (name) => ipcRenderer.invoke("runtime:getLog", name) as Promise<string>,
    refreshHealth: () =>
      ipcRenderer.invoke("runtime:refreshHealth") as Promise<RuntimeStatus>,
    start: () => ipcRenderer.invoke("runtime:start") as Promise<RuntimeStatus>,
    stop: () => ipcRenderer.invoke("runtime:stop") as Promise<RuntimeStatus>,
  },
};

contextBridge.exposeInMainWorld("miLogDesktop", api);
