export type DungeonBringInTab = "favorites" | "menus";

export interface AppPreferences {
  swipeTabsEnabled: boolean;
  /** 地下城「帶入動作」記住上次 tab */
  dungeonBringInTab: DungeonBringInTab;
}

const STORAGE_KEY = "gym-app-preferences";

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  swipeTabsEnabled: false,
  dungeonBringInTab: "menus",
};

export function loadAppPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_APP_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    const tab = parsed.dungeonBringInTab;
    return {
      swipeTabsEnabled:
        parsed.swipeTabsEnabled ?? DEFAULT_APP_PREFERENCES.swipeTabsEnabled,
      dungeonBringInTab:
        tab === "favorites" || tab === "menus"
          ? tab
          : DEFAULT_APP_PREFERENCES.dungeonBringInTab,
    };
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function saveAppPreferences(prefs: AppPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
