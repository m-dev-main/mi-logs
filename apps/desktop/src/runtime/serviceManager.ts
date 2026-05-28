import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { constants, createWriteStream, type WriteStream } from "node:fs";
import {
  access,
  chmod,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import type {
  RuntimeHealth,
  RuntimeServiceName,
  RuntimeServiceState,
  RuntimeServiceStatus,
  RuntimeStatus,
  StaleProcessRecord,
} from "./serviceTypes";

type ServiceConfig = Readonly<{
  name: RuntimeServiceName;
  label: string;
  command: string;
  args: string[];
  healthUrl?: string;
  kind: "http" | "tor";
}>;

type ServiceRecord = {
  child: ChildProcessWithoutNullStreams | null;
  logStream: WriteStream | null;
  status: MutableServiceStatus;
};

type MutableServiceStatus = {
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
};

type PidFile = Readonly<{
  name: RuntimeServiceName;
  pid: number;
  command: string;
  args: string[];
  startedAt: string;
  workspaceRoot: string;
}>;

type DesktopServiceManagerOptions = Readonly<{
  appDataPath: string;
  desktopAdminSocketPath: string;
  desktopControlSecret: string;
  workspaceRoot: string;
}>;

const SERVICE_CONFIGS: Record<RuntimeServiceName, ServiceConfig> = {
  api: {
    name: "api",
    label: "Local API",
    command: "pnpm",
    args: ["--filter", "@mi-log/api", "dev"],
    healthUrl: "http://127.0.0.1:4000/health",
    kind: "http",
  },
  static: {
    name: "static",
    label: "Readonly release server",
    command: "pnpm",
    args: ["--filter", "@mi-log/api", "serve:release"],
    healthUrl: "http://127.0.0.1:4080/",
    kind: "http",
  },
  tor: {
    name: "tor",
    label: "Tor onion service",
    command: "tor",
    args: [],
    kind: "tor",
  },
};

const SERVICE_NAMES: RuntimeServiceName[] = ["api", "static", "tor"];
const STOP_ORDER: RuntimeServiceName[] = ["tor", "static", "api"];
const HEALTH_TIMEOUT_MS = 1_500;
const START_HEALTH_WINDOW_MS = 5_000;
const STOP_TIMEOUT_MS = 5_000;
const LOG_TAIL_BYTES = 8_000;

function nowIso(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
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

function serializeStatus(status: MutableServiceStatus): RuntimeServiceStatus {
  return { ...status };
}

function exitState(exitCode: number | null): RuntimeServiceState {
  return exitCode === 0 ? "exited" : "failed";
}

export class DesktopServiceManager {
  readonly appDataPath: string;
  readonly desktopAdminSocketPath: string;
  readonly desktopControlSecret: string;
  readonly logsDir: string;
  readonly processesDir: string;
  readonly socketsDir: string;
  readonly torDataDir: string;
  readonly torHiddenServiceDir: string;
  readonly torrcPath: string;
  readonly workspaceRoot: string;

  private readonly records: Record<RuntimeServiceName, ServiceRecord>;
  private staleProcessRecords: StaleProcessRecord[] = [];

  private constructor(options: DesktopServiceManagerOptions) {
    this.appDataPath = options.appDataPath;
    this.desktopAdminSocketPath = options.desktopAdminSocketPath;
    this.desktopControlSecret = options.desktopControlSecret;
    this.workspaceRoot = options.workspaceRoot;
    this.logsDir = join(this.appDataPath, "logs");
    this.processesDir = join(this.appDataPath, "processes");
    this.socketsDir = join(this.appDataPath, "sockets");
    this.torDataDir = join(this.appDataPath, "tor", "data");
    this.torHiddenServiceDir = join(this.appDataPath, "tor", "hidden_service");
    this.torrcPath = join(this.appDataPath, "tor", "torrc");

    this.records = SERVICE_NAMES.reduce(
      (acc, name) => {
        const config = SERVICE_CONFIGS[name];
        const logPath = join(this.logsDir, `${name}.log`);
        const pidPath = join(this.processesDir, `${name}.json`);

        acc[name] = {
          child: null,
          logStream: null,
          status: {
            name,
            label: config.label,
            state: "stopped",
            health: null,
            pid: null,
            pidPath,
            logPath,
            startedAt: null,
            stoppedAt: null,
            exitCode: null,
            signal: null,
            onionHostname: null,
            lastError: null,
          },
        };

        return acc;
      },
      {} as Record<RuntimeServiceName, ServiceRecord>,
    );
  }

  static async create(
    options: DesktopServiceManagerOptions,
  ): Promise<DesktopServiceManager> {
    const manager = new DesktopServiceManager(options);
    await manager.ensureDirectories();
    await manager.configureTorService();
    await manager.cleanupStaleProcessRecords();
    return manager;
  }

  getStatus(): RuntimeStatus {
    return {
      appDataPath: this.appDataPath,
      logsDir: this.logsDir,
      processesDir: this.processesDir,
      socketsDir: this.socketsDir,
      desktopAdminSocketPath: this.desktopAdminSocketPath,
      workspaceRoot: this.workspaceRoot,
      staleProcessRecords: [...this.staleProcessRecords],
      services: {
        api: serializeStatus(this.records.api.status),
        static: serializeStatus(this.records.static.status),
        tor: serializeStatus(this.records.tor.status),
      },
    };
  }

  async startAll(): Promise<RuntimeStatus> {
    for (const name of SERVICE_NAMES) {
      if (name === "tor" && !this.isStaticServerHealthy()) {
        const message =
          "Tor was not started because the readonly release server is not healthy.";
        const record = this.records.tor;
        record.status.state = "failed";
        record.status.lastError = message;
        record.status.health = {
          checkedAt: nowIso(),
          ok: false,
          error: message,
        };
        continue;
      }

      await this.startService(name);
    }

    return this.getStatus();
  }

  async stopAll(): Promise<RuntimeStatus> {
    for (const name of STOP_ORDER) {
      await this.stopService(name);
    }
    return this.getStatus();
  }

  async refreshHealth(): Promise<RuntimeStatus> {
    await Promise.all(SERVICE_NAMES.map((name) => this.refreshServiceHealth(name)));
    return this.getStatus();
  }

  async readServiceLog(name: RuntimeServiceName): Promise<string> {
    const status = this.records[name].status;
    const raw = await readFile(status.logPath, "utf8").catch(() => "");
    return this.redactLog(raw.slice(-LOG_TAIL_BYTES));
  }

  async startService(name: RuntimeServiceName): Promise<RuntimeServiceStatus> {
    const record = this.records[name];
    if (record.child && record.status.state !== "failed") {
      return serializeStatus(record.status);
    }

    if (name === "tor") {
      await this.prepareTorService();
      if (record.status.state === "failed") {
        return serializeStatus(record.status);
      }
    }

    const config = SERVICE_CONFIGS[name];
    const startedAt = nowIso();
    const logStream = createWriteStream(record.status.logPath, { flags: "a" });
    const child = spawn(config.command, config.args, {
      cwd: this.workspaceRoot,
      env: {
        ...process.env,
        API_HOST: process.env.API_HOST ?? "127.0.0.1",
        DESKTOP_ADMIN_SOCKET_PATH: this.desktopAdminSocketPath,
        DESKTOP_CONTROL_SECRET: this.desktopControlSecret,
        STATIC_HOST: process.env.STATIC_HOST ?? "127.0.0.1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdin.end();

    record.child = child;
    record.logStream = logStream;
    record.status.state = "starting";
    record.status.health = null;
    record.status.pid = child.pid ?? null;
    record.status.startedAt = startedAt;
    record.status.stoppedAt = null;
    record.status.exitCode = null;
    record.status.signal = null;
    record.status.onionHostname = null;
    record.status.lastError = null;

    this.writeLogLine(name, `starting: ${config.command} ${config.args.join(" ")}`);
    child.stdout.pipe(logStream, { end: false });
    child.stderr.pipe(logStream, { end: false });

    child.once("error", (error) => {
      record.status.state = "failed";
      record.status.lastError = error.message;
      record.status.stoppedAt = nowIso();
      this.writeLogLine(name, `spawn failed: ${error.message}`);
    });

    child.once("exit", (code, signal) => {
      record.status.state =
        record.status.state === "stopping" ? "stopped" : exitState(code);
      record.status.pid = null;
      record.status.stoppedAt = nowIso();
      record.status.exitCode = code;
      record.status.signal = signal;
      record.child = null;
      this.writeLogLine(name, `exited: code=${String(code)} signal=${String(signal)}`);
      void this.removePidFile(name);
      setTimeout(() => {
        logStream.end();
        if (record.logStream === logStream) {
          record.logStream = null;
        }
      }, 50);
    });

    if (child.pid) {
      await this.writePidFile({
        name,
        pid: child.pid,
        command: config.command,
        args: config.args,
        startedAt,
        workspaceRoot: this.workspaceRoot,
      });
    }

    await this.waitForHealthy(name);
    return serializeStatus(record.status);
  }

  async stopService(name: RuntimeServiceName): Promise<RuntimeServiceStatus> {
    const record = this.records[name];
    const child = record.child;

    if (!child) {
      record.status.state = "stopped";
      record.status.pid = null;
      record.status.stoppedAt = record.status.stoppedAt ?? nowIso();
      await this.removePidFile(name);
      return serializeStatus(record.status);
    }

    record.status.state = "stopping";
    this.writeLogLine(name, "stopping");

    const exited = new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
    });

    child.kill("SIGTERM");

    await Promise.race([
      exited,
      sleep(STOP_TIMEOUT_MS).then(() => {
        if (record.child) {
          this.writeLogLine(name, "stop timeout; sending SIGKILL");
          record.child.kill("SIGKILL");
        }
      }),
    ]);

    await this.removePidFile(name);
    return serializeStatus(record.status);
  }

  private async ensureDirectories(): Promise<void> {
    await Promise.all([
      mkdir(this.logsDir, { recursive: true }),
      mkdir(this.processesDir, { recursive: true }),
      mkdir(this.socketsDir, { recursive: true }),
      mkdir(this.torDataDir, { recursive: true }),
      mkdir(this.torHiddenServiceDir, { recursive: true }),
    ]);
    await Promise.all([
      chmod(this.torDataDir, 0o700),
      chmod(this.torHiddenServiceDir, 0o700),
    ]);
  }

  private isStaticServerHealthy(): boolean {
    const status = this.records.static.status;
    return status.state === "running" && status.health?.ok === true;
  }

  private async configureTorService(): Promise<void> {
    const torBinary = await detectTorBinary();
    const record = this.records.tor;

    if (!torBinary) {
      record.status.state = "failed";
      record.status.lastError =
        "Tor binary not found. Set MI_LOG_TOR_BINARY_PATH or install Tor.";
      return;
    }

    SERVICE_CONFIGS.tor = {
      ...SERVICE_CONFIGS.tor,
      command: torBinary,
      args: ["-f", this.torrcPath],
    };
  }

  private async prepareTorService(): Promise<void> {
    const record = this.records.tor;
    const config = SERVICE_CONFIGS.tor;
    if (config.command === "tor") {
      record.status.state = "failed";
      record.status.lastError =
        "Tor binary not found. Set MI_LOG_TOR_BINARY_PATH or install Tor.";
      return;
    }

    const apiPort = process.env.API_PORT?.trim() || "4000";
    const staticPort = process.env.STATIC_PORT?.trim() || "4080";
    if (apiPort === staticPort) {
      record.status.state = "failed";
      record.status.lastError = "Tor target port must not match the API port.";
      return;
    }

    const torrc = [
      `DataDirectory ${this.torDataDir}`,
      "SocksPort 0",
      `HiddenServiceDir ${this.torHiddenServiceDir}`,
      `HiddenServicePort 80 127.0.0.1:${staticPort}`,
      "Log notice stdout",
      "",
    ].join("\n");

    await writeFile(this.torrcPath, torrc, { mode: 0o600 });
  }

  private async cleanupStaleProcessRecords(): Promise<void> {
    const entries = await readdir(this.processesDir).catch(() => []);
    const stale: StaleProcessRecord[] = [];

    for (const entry of entries) {
      if (!entry.endsWith(".json")) {
        continue;
      }

      const pidPath = join(this.processesDir, entry);
      const parsed = await this.readPidFile(pidPath);
      if (!parsed) {
        await unlink(pidPath).catch(() => undefined);
        continue;
      }

      if (isProcessAlive(parsed.pid)) {
        stale.push({
          name: parsed.name,
          pid: parsed.pid,
          pidPath,
          state: "still-running",
        });
        continue;
      }

      await unlink(pidPath).catch(() => undefined);
      stale.push({
        name: parsed.name,
        pid: parsed.pid,
        pidPath,
        state: "removed",
      });
    }

    this.staleProcessRecords = stale;
  }

  private async waitForHealthy(name: RuntimeServiceName): Promise<void> {
    const started = Date.now();

    while (Date.now() - started < START_HEALTH_WINDOW_MS) {
      const record = this.records[name];
      if (!record.child) {
        return;
      }

      const health = await this.refreshServiceHealth(name);
      if (health.ok) {
        return;
      }

      await sleep(500);
    }
  }

  private async refreshServiceHealth(
    name: RuntimeServiceName,
  ): Promise<RuntimeHealth> {
    const record = this.records[name];
    const config = SERVICE_CONFIGS[name];
    const checkedAt = nowIso();

    if (config.kind === "tor") {
      return await this.refreshTorHealth(name, checkedAt);
    }

    if (!record.child && record.status.state !== "running") {
      const health = {
        checkedAt,
        ok: false,
        error: "Service is not running.",
      };
      record.status.health = health;
      return health;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    try {
      if (!config.healthUrl) {
        throw new Error("HTTP health URL missing.");
      }

      const response = await fetch(config.healthUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
      const health = {
        checkedAt,
        ok: response.ok,
        statusCode: response.status,
      };
      record.status.health = health;
      if (response.ok && record.status.state === "starting") {
        record.status.state = "running";
      }
      return health;
    } catch (error) {
      const health = {
        checkedAt,
        ok: false,
        error: error instanceof Error ? error.message : "Health check failed.",
      };
      record.status.health = health;
      return health;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async refreshTorHealth(
    name: RuntimeServiceName,
    checkedAt: string,
  ): Promise<RuntimeHealth> {
    const record = this.records[name];

    if (!record.child) {
      const health = {
        checkedAt,
        ok: false,
        error: "Tor is not running.",
      };
      record.status.health = health;
      return health;
    }

    const hostnamePath = join(this.torHiddenServiceDir, "hostname");
    const hostname = await readFile(hostnamePath, "utf8")
      .then((value) => value.trim())
      .catch(() => "");

    if (hostname.endsWith(".onion")) {
      record.status.onionHostname = hostname;
      const health = { checkedAt, ok: true };
      record.status.health = health;
      if (record.status.state === "starting") {
        record.status.state = "running";
      }
      return health;
    }

    const health = {
      checkedAt,
      ok: false,
      error: "Onion hostname not ready.",
    };
    record.status.health = health;
    return health;
  }

  private async writePidFile(pidFile: PidFile): Promise<void> {
    const record = this.records[pidFile.name];
    await writeFile(record.status.pidPath, `${JSON.stringify(pidFile, null, 2)}\n`);
  }

  private async readPidFile(path: string): Promise<PidFile | null> {
    try {
      const raw = await readFile(path, "utf8");
      const parsed = JSON.parse(raw) as Partial<PidFile>;
      if (
        parsed.name !== "api" &&
        parsed.name !== "static" &&
        parsed.name !== "tor"
      ) {
        return null;
      }
      if (typeof parsed.pid !== "number" || !Number.isInteger(parsed.pid)) {
        return null;
      }
      if (
        !Array.isArray(parsed.args) ||
        !parsed.args.every((arg) => typeof arg === "string") ||
        typeof parsed.command !== "string"
      ) {
        return null;
      }
      if (
        typeof parsed.startedAt !== "string" ||
        typeof parsed.workspaceRoot !== "string"
      ) {
        return null;
      }

      return {
        name: parsed.name,
        pid: parsed.pid,
        command: parsed.command,
        args: parsed.args,
        startedAt: parsed.startedAt,
        workspaceRoot: parsed.workspaceRoot,
      };
    } catch {
      return null;
    }
  }

  private async removePidFile(name: RuntimeServiceName): Promise<void> {
    await unlink(this.records[name].status.pidPath).catch(() => undefined);
  }

  private writeLogLine(name: RuntimeServiceName, message: string): void {
    const record = this.records[name];
    record.logStream?.write(`\n[mi-log-desktop ${nowIso()}] ${message}\n`);
  }

  private redactLog(value: string): string {
    return value
      .replaceAll(this.desktopControlSecret, "[redacted]")
      .replace(
        /-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g,
        "[redacted private key]",
      );
  }
}
