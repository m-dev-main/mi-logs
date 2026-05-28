import { useCallback, useEffect, useState } from "react";
import type { RuntimeStatus } from "../types/desktop";

type DesktopRuntimeState =
  | { status: "unavailable"; runtime: null; error: null }
  | { status: "loading"; runtime: RuntimeStatus | null; error: null }
  | { status: "ready"; runtime: RuntimeStatus; error: null }
  | { status: "error"; runtime: RuntimeStatus | null; error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Desktop runtime failed.";
}

export function useDesktopRuntime() {
  const [state, setState] = useState<DesktopRuntimeState>(() =>
    window.miLogDesktop
      ? { status: "loading", runtime: null, error: null }
      : { status: "unavailable", runtime: null, error: null },
  );

  const load = useCallback(async () => {
    if (!window.miLogDesktop) {
      setState({ status: "unavailable", runtime: null, error: null });
      return;
    }

    setState((current) => ({
      status: "loading",
      runtime: current.runtime,
      error: null,
    }));

    try {
      const runtime = await window.miLogDesktop.runtime.refreshHealth();
      setState({ status: "ready", runtime, error: null });
    } catch (error) {
      setState((current) => ({
        status: "error",
        runtime: current.runtime,
        error: errorMessage(error),
      }));
    }
  }, []);

  const start = useCallback(async () => {
    if (!window.miLogDesktop) {
      return;
    }

    try {
      const runtime = await window.miLogDesktop.runtime.start();
      setState({ status: "ready", runtime, error: null });
    } catch (error) {
      setState((current) => ({
        status: "error",
        runtime: current.runtime,
        error: errorMessage(error),
      }));
    }
  }, []);

  const stop = useCallback(async () => {
    if (!window.miLogDesktop) {
      return;
    }

    try {
      const runtime = await window.miLogDesktop.runtime.stop();
      setState({ status: "ready", runtime, error: null });
    } catch (error) {
      setState((current) => ({
        status: "error",
        runtime: current.runtime,
        error: errorMessage(error),
      }));
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [load]);

  return {
    ...state,
    isDesktop: window.miLogDesktop !== undefined,
    refresh: load,
    start,
    stop,
  };
}

