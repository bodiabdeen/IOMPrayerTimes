import AsyncStorage from '@react-native-async-storage/async-storage';
import {CombinedPrayerData} from '../types';
import {CACHE_KEYS} from '../utils/constants';

export const loadCachedData = async (): Promise<CombinedPrayerData | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEYS.PRAYER_DATA);
    if (cachedData) {
      console.log('✅ Loaded cached prayer data');
      return JSON.parse(cachedData);
    }
    console.log('ℹ️ No cached data found');
    return null;
  } catch (error) {
    console.error('❌ Error loading cached data:', error);
    return null;
  }
};

export const saveCachedData = async (data: CombinedPrayerData): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.PRAYER_DATA, JSON.stringify(data));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, new Date().toISOString());
    console.log('✅ Cached prayer data saved');
  } catch (error) {
    console.error('❌ Error saving cached data:', error);
  }
};

export const clearCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEYS.PRAYER_DATA);
    await AsyncStorage.removeItem(CACHE_KEYS.LAST_UPDATE);
    console.log('✅ Cache cleared');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
};

export const getLastUpdateTime = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
  } catch (error) {
    console.error('❌ Error getting last update time:', error);
    return null;
  }
};