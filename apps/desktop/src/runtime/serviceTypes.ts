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
  signal: NodeJS.Signals | null;
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
