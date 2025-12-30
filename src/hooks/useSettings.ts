import { useState, useEffect } from 'react';

export interface UserSettings {
  staySignedIn: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  staySignedIn: true, // Enabled by default
};

const STORAGE_KEY = 'user_settings';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
}
