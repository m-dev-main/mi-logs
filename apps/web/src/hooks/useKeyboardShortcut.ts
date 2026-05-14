import { useEffect } from "react";

export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options: { metaOrCtrl?: boolean; enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const metaOrCtrl = options.metaOrCtrl ?? false;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      const modifierMatches = !metaOrCtrl || event.metaKey || event.ctrlKey;

      if (!keyMatches || !modifierMatches) {
        return;
      }

      event.preventDefault();
      handler();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, handler, key, metaOrCtrl]);
}
