import { systemPreferences } from "electron";

export type DesktopLockStatus = Readonly<{
  available: boolean;
  locked: boolean;
  unlockedAt: string | null;
  lastActivityAt: string | null;
  lockedAt: string;
  idleTimeoutMs: number;
  reason: string | null;
}>;

type DesktopBiometricLockOptions = Readonly<{
  idleTimeoutMs?: number;
}>;

const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function canPromptBiometric(): boolean {
  return process.platform === "darwin" && systemPreferences.canPromptTouchID();
}

function parseIdleTimeout(value: number | undefined): number {
  if (
    value === undefined ||
    !Number.isFinite(value) ||
    value < 60_000 ||
    value > 24 * 60 * 60 * 1000
  ) {
    return DEFAULT_IDLE_TIMEOUT_MS;
  }

  return value;
}

export class DesktopBiometricLock {
  private locked = true;
  private lockedAt = nowIso();
  private unlockedAt: string | null = null;
  private lastActivityAt: string | null = null;
  private reason: string | null = "App launch requires biometric unlock.";
  private readonly idleTimeoutMs: number;

  constructor(options: DesktopBiometricLockOptions = {}) {
    this.idleTimeoutMs = parseIdleTimeout(options.idleTimeoutMs);
  }

  getStatus(): DesktopLockStatus {
    this.lockIfIdle();

    return {
      available: canPromptBiometric(),
      locked: this.locked,
      unlockedAt: this.unlockedAt,
      lastActivityAt: this.lastActivityAt,
      lockedAt: this.lockedAt,
      idleTimeoutMs: this.idleTimeoutMs,
      reason: this.reason,
    };
  }

  lock(reason = "Desktop admin locked."): DesktopLockStatus {
    this.locked = true;
    this.lockedAt = nowIso();
    this.unlockedAt = null;
    this.lastActivityAt = null;
    this.reason = reason;
    return this.getStatus();
  }

  recordActivity(): DesktopLockStatus {
    if (!this.locked) {
      this.lastActivityAt = nowIso();
    }

    return this.getStatus();
  }

  async unlock(reason = "Unlock mi-log admin."): Promise<DesktopLockStatus> {
    await this.prompt(reason);
    return this.unlockAfterPrompt();
  }

  async requireFreshBiometric(reason: string): Promise<DesktopLockStatus> {
    await this.prompt(reason);
    return this.unlockAfterPrompt();
  }

  assertUnlocked(): void {
    this.lockIfIdle();
    if (this.locked) {
      throw new Error(this.reason ?? "Desktop admin locked.");
    }
  }

  private async prompt(reason: string): Promise<void> {
    if (!canPromptBiometric()) {
      throw new Error("Touch ID is not available for this desktop session.");
    }

    await systemPreferences.promptTouchID(reason);
  }

  private unlockAfterPrompt(): DesktopLockStatus {
    const unlockedAt = nowIso();
    this.locked = false;
    this.unlockedAt = unlockedAt;
    this.lastActivityAt = unlockedAt;
    this.reason = null;
    return this.getStatus();
  }

  private lockIfIdle(): void {
    if (this.locked || this.lastActivityAt === null) {
      return;
    }

    const lastActivity = Date.parse(this.lastActivityAt);
    if (!Number.isFinite(lastActivity)) {
      this.lock("Idle timeout reached.");
      return;
    }

    if (Date.now() - lastActivity >= this.idleTimeoutMs) {
      this.lock("Idle timeout reached.");
    }
  }
}
