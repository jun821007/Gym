export interface AppPreferences {
  swipeTabsEnabled: boolean;
}

const STORAGE_KEY = "gym-app-preferences";

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  swipeTabsEnabled: false,
};

export function loadAppPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_APP_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      swipeTabsEnabled:
        parsed.swipeTabsEnabled ?? DEFAULT_APP_PREFERENCES.swipeTabsEnabled,
    };
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function saveAppPreferences(prefs: AppPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
