"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_APP_PREFERENCES,
  loadAppPreferences,
  saveAppPreferences,
  type DungeonBringInTab,
} from "@/lib/app-preferences";

export function useAppPreferences() {
  const [swipeTabsEnabled, setSwipeTabsEnabledState] = useState(
    DEFAULT_APP_PREFERENCES.swipeTabsEnabled,
  );
  const [dungeonBringInTab, setDungeonBringInTabState] =
    useState<DungeonBringInTab>(DEFAULT_APP_PREFERENCES.dungeonBringInTab);

  useEffect(() => {
    const prefs = loadAppPreferences();
    setSwipeTabsEnabledState(prefs.swipeTabsEnabled);
    setDungeonBringInTabState(prefs.dungeonBringInTab);
  }, []);

  const setSwipeTabsEnabled = useCallback((enabled: boolean) => {
    setSwipeTabsEnabledState(enabled);
    const prev = loadAppPreferences();
    saveAppPreferences({ ...prev, swipeTabsEnabled: enabled });
  }, []);

  const setDungeonBringInTab = useCallback((tab: DungeonBringInTab) => {
    setDungeonBringInTabState(tab);
    const prev = loadAppPreferences();
    saveAppPreferences({ ...prev, dungeonBringInTab: tab });
  }, []);

  return {
    swipeTabsEnabled,
    setSwipeTabsEnabled,
    dungeonBringInTab,
    setDungeonBringInTab,
  };
}
