import { app, BrowserWindow, ipcMain, shell } from "electron";
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { DesktopAdminProxy } from "./runtime/adminProxy";
import { DesktopBiometricLock } from "./runtime/biometricLock";
import {
  DesktopReleaseManager,
  RELEASE_COMMAND_NAMES,
  type ReleaseCommandName,
} from "./runtime/releaseManager";
import { DesktopServiceManager } from "./runtime/serviceManager";
import type { RuntimeStatus } from "./runtime/serviceTypes";
import { DesktopSetupValidator } from "./runtime/setupValidator";
import { findWorkspaceRoot } from "./runtime/workspace";

const DEFAULT_WINDOW_WIDTH = 1320;
const DEFAULT_WINDOW_HEIGHT = 900;

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

let mainWindow: BrowserWindow | null = null;
let adminProxy: DesktopAdminProxy | null = null;
let biometricLock: DesktopBiometricLock | null = null;
let releaseManager: DesktopReleaseManager | null = null;
let serviceManager: DesktopServiceManager | null = null;
let setupValidator: DesktopSetupValidator | null = null;
let ipcRegistered = false;
let quitting = false;
let servicesStopped = false;

function rendererDevUrl(): URL | null {
  const raw = process.env.MI_LOG_DESKTOP_RENDERER_URL?.trim();
  if (!raw) {
    return null;
  }

  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("MI_LOG_DESKTOP_RENDERER_URL must use http or https.");
  }
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("Desktop renderer dev URL must stay on localhost.");
  }

  return url;
}

function builtRendererIndexPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "web-dist", "index.html");
  }

  return join(__dirname, "../../web/dist-desktop/index.html");
}

function desktopDevUrl(devUrl: URL): string {
  const nextUrl = new URL(devUrl.toString());
  if (nextUrl.pathname === "/" || nextUrl.pathname === "") {
    nextUrl.pathname = "/admin";
  }
  return nextUrl.toString();
}

function resolveWorkspaceRoot(): string {
  const configured = process.env.MI_LOG_WORKSPACE_ROOT?.trim();
  if (configured) {
    return findWorkspaceRoot(configured);
  }

  try {
    return findWorkspaceRoot(__dirname);
  } catch (error) {
    if (app.isPackaged) {
      return app.getPath("home");
    }

    throw error;
  }
}

async function hasWorkspaceRuntime(workspaceRoot: string): Promise<boolean> {
  const requiredPaths = [
    "pnpm-workspace.yaml",
    "package.json",
    "apps/api/package.json",
  ];

  for (const relativePath of requiredPaths) {
    try {
      await access(join(workspaceRoot, relativePath), constants.F_OK);
    } catch {
      return false;
    }
  }

  return true;
}

function requireServiceManager(): DesktopServiceManager {
  if (!serviceManager) {
    throw new Error("Desktop service manager has not been initialized.");
  }

  return serviceManager;
}

function requireAdminProxy(): DesktopAdminProxy {
  if (!adminProxy) {
    throw new Error("Desktop admin proxy has not been initialized.");
  }

  return adminProxy;
}

function requireBiometricLock(): DesktopBiometricLock {
  if (!biometricLock) {
    throw new Error("Desktop biometric lock has not been initialized.");
  }

  return biometricLock;
}

function requireReleaseManager(): DesktopReleaseManager {
  if (!releaseManager) {
    throw new Error("Desktop release manager has not been initialized.");
  }

  return releaseManager;
}

function requireSetupValidator(): DesktopSetupValidator {
  if (!setupValidator) {
    throw new Error("Desktop setup validator has not been initialized.");
  }

  return setupValidator;
}

function assertReleaseCommand(value: unknown): ReleaseCommandName {
  if (typeof value !== "string") {
    throw new Error("Desktop release command must be a string.");
  }
  if (!RELEASE_COMMAND_NAMES.includes(value as ReleaseCommandName)) {
    throw new Error("Unknown desktop release command.");
  }

  return value as ReleaseCommandName;
}

function assertUnlockedForDesktopAction(): void {
  requireBiometricLock().assertUnlocked();
  requireBiometricLock().recordActivity();
}

function desktopStatus(renderer: DesktopStatus["renderer"]): DesktopStatus {
  const manager = requireServiceManager();

  return {
    appDataPath: app.getPath("userData"),
    isPackaged: app.isPackaged,
    platform: process.platform,
    renderer,
    runtime: manager.getStatus(),
    versions: {
      chrome: process.versions.chrome,
      electron: process.versions.electron,
      node: process.versions.node,
    },
  };
}

function registerIpc(renderer: DesktopStatus["renderer"]): void {
  if (ipcRegistered) {
    return;
  }

  ipcMain.handle("desktop:getStatus", () => desktopStatus(renderer));
  ipcMain.handle("runtime:getStatus", () => requireServiceManager().getStatus());
  ipcMain.handle("runtime:start", () => requireServiceManager().startAll());
  ipcMain.handle("runtime:stop", () => requireServiceManager().stopAll());
  ipcMain.handle("runtime:refreshHealth", () =>
    requireServiceManager().refreshHealth(),
  );
  ipcMain.handle("runtime:getLog", (_event, name) =>
    requireServiceManager().readServiceLog(name),
  );
  ipcMain.handle("admin:request", (_event, input) =>
    requireAdminProxy().request(input),
  );
  ipcMain.handle("setup:validate", () => requireSetupValidator().validate());
  ipcMain.handle("release:proofSummary", () =>
    requireReleaseManager().proofSummary(),
  );
  ipcMain.handle("release:restartStatic", async () => {
    assertUnlockedForDesktopAction();
    return await requireReleaseManager().restartStaticServer();
  });
  ipcMain.handle("release:run", async (_event, commandName) => {
    assertUnlockedForDesktopAction();
    return await requireReleaseManager().run(assertReleaseCommand(commandName));
  });
  ipcMain.handle("lock:getStatus", () => requireBiometricLock().getStatus());
  ipcMain.handle("lock:lock", (_event, reason) =>
    requireBiometricLock().lock(typeof reason === "string" ? reason : undefined),
  );
  ipcMain.handle("lock:recordActivity", () =>
    requireBiometricLock().recordActivity(),
  );
  ipcMain.handle("lock:requireBiometric", (_event, reason) =>
    requireBiometricLock().requireFreshBiometric(
      typeof reason === "string" ? reason : "Confirm this mi-log admin action.",
    ),
  );
  ipcMain.handle("lock:unlock", (_event, reason) =>
    requireBiometricLock().unlock(
      typeof reason === "string" ? reason : "Unlock mi-log admin.",
    ),
  );
  ipcMain.handle("desktop:openExternal", async (_event, rawUrl: string) => {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Only http and https URLs can be opened externally.");
    }

    await shell.openExternal(url.toString());
  });

  ipcRegistered = true;
}

function hardenWindowNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    const nextUrl = new URL(url);
    if (nextUrl.protocol === "file:") {
      return;
    }
    if (
      (nextUrl.protocol === "http:" || nextUrl.protocol === "https:") &&
      (nextUrl.hostname === "127.0.0.1" || nextUrl.hostname === "localhost")
    ) {
      return;
    }

    event.preventDefault();
    void shell.openExternal(url);
  });
}

async function createMainWindow(): Promise<void> {
  const devUrl = rendererDevUrl();
  const renderer = devUrl ? "dev-server" : "web-build";

  registerIpc(renderer);

  mainWindow = new BrowserWindow({
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    minWidth: 980,
    minHeight: 720,
    title: "mi-log",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.js"),
      sandbox: false,
    },
  });

  hardenWindowNavigation(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (devUrl) {
    await mainWindow.loadURL(desktopDevUrl(devUrl));
  } else {
    await mainWindow.loadFile(builtRendererIndexPath(), { hash: "/admin" });
  }
}

async function shutdownServices(): Promise<void> {
  if (servicesStopped) {
    return;
  }

  servicesStopped = true;
  await serviceManager?.stopAll();
}

function requestQuit(): void {
  if (quitting) {
    return;
  }

  quitting = true;
  void shutdownServices().finally(() => {
    app.quit();
  });
}

app.setName("mi-log");

app.on("before-quit", (event) => {
  if (servicesStopped) {
    return;
  }

  event.preventDefault();
  requestQuit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (!mainWindow) {
    void createMainWindow();
  }
});

process.on("SIGINT", requestQuit);
process.on("SIGTERM", requestQuit);

void app.whenReady().then(async () => {
  const workspaceRoot = resolveWorkspaceRoot();
  const desktopControlSecret = randomBytes(32).toString("base64url");
  const desktopAdminSocketPath = join(
    app.getPath("userData"),
    "sockets",
    "admin-api.sock",
  );

  serviceManager = await DesktopServiceManager.create({
    appDataPath: app.getPath("userData"),
    desktopAdminSocketPath,
    desktopControlSecret,
    workspaceRoot,
  });
  releaseManager = new DesktopReleaseManager({
    serviceManager,
    workspaceRoot,
  });
  setupValidator = new DesktopSetupValidator({
    workspaceRoot,
  });
  biometricLock = new DesktopBiometricLock({
    idleTimeoutMs: Number(process.env.MI_LOG_DESKTOP_LOCK_TIMEOUT_MS),
  });
  adminProxy = new DesktopAdminProxy({
    beforeRequest: () => {
      requireBiometricLock().assertUnlocked();
      requireBiometricLock().recordActivity();
    },
    controlSecret: desktopControlSecret,
    socketPath: desktopAdminSocketPath,
  });

  if (await hasWorkspaceRuntime(workspaceRoot)) {
    await serviceManager.startAll();
  }
  await createMainWindow();
});
