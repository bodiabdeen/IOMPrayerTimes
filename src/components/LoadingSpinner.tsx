import React from 'react';
import {View, ActivityIndicator, Text, StyleSheet} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

export const LoadingSpinner: React.FC = () => {
  const {theme} = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={[styles.text, {color: theme.text}]}>
        Loading Prayer Times...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});