import { useCallback, useEffect, useRef, useState } from "react";
import type { DesktopLockStatus } from "../types/desktop";

type DesktopLockState =
  | { status: "unavailable"; lock: null; error: null }
  | { status: "loading"; lock: DesktopLockStatus | null; error: null }
  | { status: "ready"; lock: DesktopLockStatus; error: null }
  | { status: "error"; lock: DesktopLockStatus | null; error: string };

const ACTIVITY_THROTTLE_MS = 15_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Desktop lock failed.";
}

export function useDesktopLock() {
  const lastActivitySentAt = useRef(0);
  const [state, setState] = useState<DesktopLockState>(() =>
    window.miLogDesktop
      ? { status: "loading", lock: null, error: null }
      : { status: "unavailable", lock: null, error: null },
  );

  const refresh = useCallback(async () => {
    if (!window.miLogDesktop) {
      setState({ status: "unavailable", lock: null, error: null });
      return;
    }

    try {
      const lock = await window.miLogDesktop.lock.getStatus();
      setState({ status: "ready", lock, error: null });
    } catch (error) {
      setState((current) => ({
        status: "error",
        lock: current.lock,
        error: errorMessage(error),
      }));
    }
  }, []);

  const unlock = useCallback(async () => {
    if (!window.miLogDesktop) {
      return;
    }

    setState((current) => ({
      status: "loading",
      lock: current.lock,
      error: null,
    }));

    try {
      const lock = await window.miLogDesktop.lock.unlock("Unlock mi-log admin.");
      setState({ status: "ready", lock, error: null });
      window.dispatchEvent(new Event("mi-log-desktop-lock-changed"));
    } catch (error) {
      setState((current) => ({
        status: "error",
        lock: current.lock,
        error: errorMessage(error),
      }));
    }
  }, []);

  const lockDesktop = useCallback(async (reason = "Desktop admin locked.") => {
    if (!window.miLogDesktop) {
      return;
    }

    const next = await window.miLogDesktop.lock.lock(reason);
    setState({ status: "ready", lock: next, error: null });
    window.dispatchEvent(new Event("mi-log-desktop-lock-changed"));
  }, []);

  const recordActivity = useCallback(async () => {
    if (!window.miLogDesktop) {
      return;
    }

    const now = Date.now();
    if (now - lastActivitySentAt.current < ACTIVITY_THROTTLE_MS) {
      return;
    }

    lastActivitySentAt.current = now;
    const next = await window.miLogDesktop.lock.recordActivity();
    setState({ status: "ready", lock: next, error: null });
  }, []);

  useEffect(() => {
    void refresh();

    const timer = window.setInterval(() => {
      void refresh();
    }, 10_000);

    const onLockChanged = () => {
      void refresh();
    };

    window.addEventListener("mi-log-desktop-lock-changed", onLockChanged);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("mi-log-desktop-lock-changed", onLockChanged);
    };
  }, [refresh]);

  return {
    ...state,
    isDesktop: window.miLogDesktop !== undefined,
    lockDesktop,
    recordActivity,
    refresh,
    unlock,
  };
}
