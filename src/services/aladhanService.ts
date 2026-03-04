// src/services/aladhanService.ts
// Aladhan API integration for fetching prayer times

import { AladhanResponse, AladhanTimings, AladhanDate } from '../types';
import { ALADHAN_API } from '../utils/constants';
import { formatDateForAPI } from '../utils/dateUtils';

/**
 * Fetch prayer times from Aladhan API
 */
export const fetchPrayerTimesFromAladhan = async (
  date: Date,
  method: number,
  latitude: number,
  longitude: number
): Promise<{ timings: AladhanTimings; date: AladhanDate } | null> => {
  try {
    const dateStr = formatDateForAPI(date);
    const url = `${ALADHAN_API.BASE_URL}/timings/${dateStr}?latitude=${latitude}&longitude=${longitude}&method=${method}&timezonestring=${ALADHAN_API.TIMEZONE}`;
    
    console.log('📡 Fetching from Aladhan API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Aladhan API error: ${response.status}`);
    }
    
    const data: AladhanResponse = await response.json();
    
    if (data.code !== 200 || data.status !== 'OK') {
      throw new Error('Invalid response from Aladhan API');
    }
    
    console.log('✅ Successfully fetched prayer times from Aladhan');
    
    return {
      timings: data.data.timings,
      date: data.data.date,
    };
  } catch (error) {
    console.error('❌ Error fetching from Aladhan API:', error);
    return null;
  }
};

/**
 * Extract clean time from Aladhan response (removes timezone info)
 */
export const cleanAladhanTime = (timeStr: string): string => {
  // Aladhan returns times like "06:21 (GMT)" or "06:21"
  // We want just "06:21"
  return timeStr.split(' ')[0];
};

/**
 * Convert Aladhan timings to our format
 */
export const convertAladhanTimings = (timings: AladhanTimings): {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
} => {
  return {
    fajr: cleanAladhanTime(timings.Fajr),
    sunrise: cleanAladhanTime(timings.Sunrise),
    dhuhr: cleanAladhanTime(timings.Dhuhr),
    asr: cleanAladhanTime(timings.Asr),
    maghrib: cleanAladhanTime(timings.Maghrib),
    isha: cleanAladhanTime(timings.Isha),
  };
};

/**
 * Format Aladhan date to readable Gregorian date
 */
export const formatAladhanGregorianDate = (date: AladhanDate): string => {
  const { weekday, day, month, year } = date.gregorian;
  return `${weekday.en}, ${day} ${month.en} ${year}`;
};

/**
 * Format Aladhan date to readable Hijri date
 */
export const formatAladhanHijriDate = (date: AladhanDate): string => {
  const { day, month, year } = date.hijri;
  return `${day} ${month.en} ${year} AH`;
};
