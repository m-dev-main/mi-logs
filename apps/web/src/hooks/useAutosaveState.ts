import { useCallback, useState } from "react";

export type SaveState = "saved" | "dirty" | "saving" | "error";

export function useAutosaveState(initialState: SaveState = "saved") {
  const [saveState, setSaveState] = useState<SaveState>(initialState);

  const markDirty = useCallback(() => {
    setSaveState((current) => (current === "saving" ? current : "dirty"));
  }, []);

  const markSaving = useCallback(() => {
    setSaveState("saving");
  }, []);

  const markSaved = useCallback(() => {
    setSaveState("saved");
  }, []);

  const markError = useCallback(() => {
    setSaveState("error");
  }, []);

  return {
    saveState,
    markDirty,
    markSaving,
    markSaved,
    markError,
  };
}
