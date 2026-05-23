import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { getSettingsFromDB, saveSettingToDB } from '../db/database';

type ThemeType = 'light' | 'dark' | 'system';
type CurrencyType = 'USD' | 'PHP';
type TimeFormatType = '12h' | '24h';

export interface ThemeColors {
  BRAND: string;
  BG_COLOR: string;
  TEXT_DARK: string;
  TEXT_MUTED: string;
  CARD_BG: string;
  BORDER: string;
  GREEN: string;
  RED: string;
}

interface SettingsContextData {
  themeMode: ThemeType;
  accentColor: string;
  currency: CurrencyType;
  timeFormat: TimeFormatType;
  notificationsEnabled: boolean;
  theme: ThemeColors;
  isDark: boolean;
  updateSetting: (key: string, value: string) => Promise<void>;
  ready: boolean;
}

const SettingsContext = createContext<SettingsContextData | null>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  
  const [themeMode, setThemeMode] = useState<ThemeType>('system');
  const [accentColor, setAccentColor] = useState('#6B4EFF');
  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const [timeFormat, setTimeFormat] = useState<TimeFormatType>('12h');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const dbSettings = await getSettingsFromDB();
        if (dbSettings.theme) setThemeMode(dbSettings.theme as ThemeType);
        if (dbSettings.accentColor) setAccentColor(dbSettings.accentColor);
        if (dbSettings.currency) setCurrency(dbSettings.currency as CurrencyType);
        if (dbSettings.timeFormat) setTimeFormat(dbSettings.timeFormat as TimeFormatType);
        if (dbSettings.notificationsEnabled) setNotificationsEnabled(dbSettings.notificationsEnabled === 'true');
      } catch (e) {
        console.error("Failed to load settings", e);
      }
      setReady(true);
    };
    loadSettings();
  }, []);

  const updateSetting = async (key: string, value: string) => {
    try {
      await saveSettingToDB(key, value);
      if (key === 'theme') setThemeMode(value as ThemeType);
      if (key === 'accentColor') setAccentColor(value);
      if (key === 'currency') setCurrency(value as CurrencyType);
      if (key === 'timeFormat') setTimeFormat(value as TimeFormatType);
      if (key === 'notificationsEnabled') setNotificationsEnabled(value === 'true');
    } catch (e) {
      console.error("Failed to save setting", e);
    }
  };

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const theme: ThemeColors = isDark ? {
    BRAND: accentColor,
    BG_COLOR: '#0E0E10',
    TEXT_DARK: '#F0F0F4',
    TEXT_MUTED: '#8A8A9A',
    CARD_BG: '#1A1A1F',
    BORDER: '#2A2A35',
    GREEN: '#22C55E',
    RED: '#F87171',
  } : {
    BRAND: accentColor,
    BG_COLOR: '#F4F4F0',
    TEXT_DARK: '#18181B',
    TEXT_MUTED: '#8A8FA8',
    CARD_BG: '#FFFFFF',
    BORDER: '#E8E8E2',
    GREEN: '#22C55E',
    RED: '#F87171',
  };

  return (
    <SettingsContext.Provider value={{
      themeMode, accentColor, currency, timeFormat, notificationsEnabled,
      theme, isDark, updateSetting, ready
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};
