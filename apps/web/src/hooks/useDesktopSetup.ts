import { useCallback, useEffect, useState } from "react";
import type { DesktopSetupStatus } from "../types/desktop";

type DesktopSetupState =
  | { status: "unavailable"; setup: null; error: null }
  | { status: "loading"; setup: DesktopSetupStatus | null; error: null }
  | { status: "ready"; setup: DesktopSetupStatus; error: null }
  | { status: "error"; setup: DesktopSetupStatus | null; error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Desktop setup validation failed.";
}

export function useDesktopSetup() {
  const [state, setState] = useState<DesktopSetupState>(() =>
    window.miLogDesktop
      ? { status: "loading", setup: null, error: null }
      : { status: "unavailable", setup: null, error: null },
  );

  const validate = useCallback(async () => {
    if (!window.miLogDesktop) {
      setState({ status: "unavailable", setup: null, error: null });
      return;
    }

    setState((current) => ({
      status: "loading",
      setup: current.setup,
      error: null,
    }));

    try {
      const setup = await window.miLogDesktop.setup.validate();
      setState({ status: "ready", setup, error: null });
    } catch (error) {
      setState((current) => ({
        status: "error",
        setup: current.setup,
        error: errorMessage(error),
      }));
    }
  }, []);

  useEffect(() => {
    void validate();
  }, [validate]);

  return {
    ...state,
    isDesktop: window.miLogDesktop !== undefined,
    validate,
  };
}
