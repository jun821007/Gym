"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_APP_PREFERENCES,
  loadAppPreferences,
  saveAppPreferences,
} from "@/lib/app-preferences";

export function useAppPreferences() {
  const [swipeTabsEnabled, setSwipeTabsEnabledState] = useState(
    DEFAULT_APP_PREFERENCES.swipeTabsEnabled,
  );

  useEffect(() => {
    setSwipeTabsEnabledState(loadAppPreferences().swipeTabsEnabled);
  }, []);

  const setSwipeTabsEnabled = useCallback((enabled: boolean) => {
    setSwipeTabsEnabledState(enabled);
    saveAppPreferences({ swipeTabsEnabled: enabled });
  }, []);

  return { swipeTabsEnabled, setSwipeTabsEnabled };
}
