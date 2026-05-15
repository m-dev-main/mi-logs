import { useEffect, useState } from "react";

const STORAGE_NAME = "mi-log:reading-preferences";

export type ReadingWidth = "narrow" | "comfortable" | "wide";
export type ReadingFontScale = "small" | "normal" | "large";
export type ReadingDensity = "calm" | "compact";
export type ReadingTheme = "ember" | "graphite" | "parchment-dark";

export type ReadingPreferences = {
  width: ReadingWidth;
  fontScale: ReadingFontScale;
  density: ReadingDensity;
  theme: ReadingTheme;
};

const defaultPreferences: ReadingPreferences = {
  width: "comfortable",
  fontScale: "normal",
  density: "calm",
  theme: "ember",
};

function isReadingPreferences(value: unknown): value is ReadingPreferences {
  const candidate = value as ReadingPreferences;
  return (
    typeof value === "object" &&
    value !== null &&
    ["narrow", "comfortable", "wide"].includes(candidate.width) &&
    ["small", "normal", "large"].includes(candidate.fontScale) &&
    ["calm", "compact"].includes(candidate.density) &&
    ["ember", "graphite", "parchment-dark"].includes(candidate.theme)
  );
}

function readStoredPreferences(): ReadingPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_NAME);
    if (!raw) {
      return defaultPreferences;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isReadingPreferences(parsed) ? parsed : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function useReadingPreferences() {
  const [preferences, setPreferences] = useState<ReadingPreferences>(() =>
    typeof window === "undefined" ? defaultPreferences : readStoredPreferences(),
  );

  useEffect(() => {
    document.documentElement.dataset.readingTheme = preferences.theme;

    try {
      window.localStorage.setItem(STORAGE_NAME, JSON.stringify(preferences));
    } catch {
      // Reading preferences are optional and non-sensitive.
    }
  }, [preferences]);

  return {
    preferences,
    setPreferences: (next: Partial<ReadingPreferences>) =>
      setPreferences((current) => ({ ...current, ...next })),
    resetPreferences: () => setPreferences(defaultPreferences),
  };
}
