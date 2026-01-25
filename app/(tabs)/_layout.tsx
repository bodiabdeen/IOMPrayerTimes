import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.cardBackground,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Prayer Times',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
