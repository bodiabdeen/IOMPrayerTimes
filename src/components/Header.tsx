import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

const STATUS_BAR_PADDING = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

export const Header: React.FC = () => {
  const {isDark, toggleTheme, theme} = useTheme();

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: theme.header, paddingTop: 12 + STATUS_BAR_PADDING},
      ]}>
      <View style={styles.content}>
        <Text style={[styles.title, {color: theme.textOnPrimary}]}>
          The Isle of Man Islamic Centre
        </Text>
        
        <TouchableOpacity
          onPress={toggleTheme}
          style={styles.themeToggle}
          activeOpacity={0.7}>
          <Text style={styles.icon}>{isDark ? '🌙' : '☀️'}</Text>
          <View style={[
            styles.toggleTrack,
            {backgroundColor: isDark ? theme.accent : '#ccc'}
          ]}>
            <View style={[
              styles.toggleThumb,
              {
                backgroundColor: '#fff',
                transform: [{translateX: isDark ? 22 : 2}]
              }
            ]} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  toggleTrack: {
    width: 48,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});