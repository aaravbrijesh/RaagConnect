import { useState, useEffect } from 'react';

export interface UserSettings {
  staySignedIn: boolean;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  eventReminders: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  staySignedIn: true,
  theme: 'system',
  emailNotifications: true,
  eventReminders: true,
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

  // Apply theme on mount and when it changes
  useEffect(() => {
    const applyTheme = () => {
      if (settings.theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', isDark);
      } else {
        document.documentElement.classList.toggle('dark', settings.theme === 'dark');
      }
    };
    applyTheme();
  }, [settings.theme]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
}
