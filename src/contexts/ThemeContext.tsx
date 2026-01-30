import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Theme} from '../styles/colors';
import {CACHE_KEYS} from '../utils/constants';

export type TimeFormat = '12h' | '24h';

interface ThemeContextType {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
  timeFormat: TimeFormat;
  toggleTimeFormat: () => void;
  formatTime: (time: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const TIME_FORMAT_KEY = '@time_format_preference';

export const ThemeProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(systemColorScheme === 'dark');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h');

  // Load saved preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(CACHE_KEYS.THEME);
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }

      const savedTimeFormat = await AsyncStorage.getItem(TIME_FORMAT_KEY);
      if (savedTimeFormat !== null) {
        setTimeFormat(savedTimeFormat as TimeFormat);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem(CACHE_KEYS.THEME, newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTimeFormat = async () => {
    try {
      const newFormat: TimeFormat = timeFormat === '24h' ? '12h' : '24h';
      setTimeFormat(newFormat);
      await AsyncStorage.setItem(TIME_FORMAT_KEY, newFormat);
    } catch (error) {
      console.error('Error saving time format preference:', error);
    }
  };

  const formatTime = (time: string): string => {
    if (!time || time === '--:--') return time;

    if (timeFormat === '12h') {
      try {
        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return time;

        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
      } catch {
        return time;
      }
    }

    return time;
  };

  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{
      isDark,
      theme,
      toggleTheme,
      timeFormat,
      toggleTimeFormat,
      formatTime
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
