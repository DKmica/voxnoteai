import React, { createContext, useContext, useMemo, useState } from "react";
import {
  defaultPreferences,
  loadPreferences,
  Preferences,
  savePreferences,
} from "@/state/preferences";
import { defaultFeatureFlags, FeatureFlags } from "@/config/featureFlags";

type AppState = {
  preferences: Preferences;
  setPreferences: (next: Preferences) => void;
  featureFlags: FeatureFlags;
  setFeatureFlags: (next: FeatureFlags) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferencesState] = useState<Preferences>(() =>
    typeof window === "undefined" ? defaultPreferences : loadPreferences()
  );
  const [featureFlags, setFeatureFlagsState] = useState<FeatureFlags>(() => {
    try {
      const raw = localStorage.getItem("voxnote.flags.v1");
      return raw ? { ...defaultFeatureFlags, ...JSON.parse(raw) } : defaultFeatureFlags;
    } catch {
      return defaultFeatureFlags;
    }
  });

  const value = useMemo<AppState>(
    () => ({
      preferences,
      setPreferences: (next) => {
        setPreferencesState(next);
        savePreferences(next);
      },
      featureFlags,
      setFeatureFlags: (next) => {
        setFeatureFlagsState(next);
        localStorage.setItem("voxnote.flags.v1", JSON.stringify(next));
      },
    }),
    [preferences, featureFlags]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used within AppStateProvider");
  return v;
}
