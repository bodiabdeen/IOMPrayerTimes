// src/services/firebaseService.ts
// Firebase Firestore integration service

import { FIREBASE_CONFIG, PRAYER_NAMES } from '../utils/constants';
import { ApiConfig, DailyConfig, AnnouncementsData, CombinedPrayerData, Prayer } from '../types';
import {
  fetchPrayerTimesFromAladhan,
  convertAladhanTimings,
  formatAladhanGregorianDate,
  formatAladhanHijriDate,
} from './aladhanService';
import { applyTimeOffset } from '../utils/dateUtils';
import { getNextPrayer } from '../utils/prayerUtils';

// Conditional imports for Firebase (only available in native builds)
let firestore: any = null;
let firebase: any = null;

try {
  // Try to import Firebase modules (will fail in Expo Go)
  firestore = require('@react-native-firebase/firestore').default;
  firebase = require('@react-native-firebase/app').default;
  console.log('✅ Firebase modules loaded');
} catch (error) {
  console.log('⚠️ Firebase not available - running in development mode with mock data');
}

/**
 * Initialize Firebase (must be called before any Firestore operations)
 */
export const initializeFirebase = async (): Promise<void> => {
  try {
    if (!firebase) {
      console.log('⚠️ Firebase not available in this environment');
      return;
    }

    // Check if Firebase is already initialized
    const apps = firebase.apps;
    if (apps.length > 0) {
      console.log('✅ Firebase already initialized');
      return;
    }

    // Firebase will auto-initialize from google-services.json
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

/**
 * Fetch API configuration from Firebase
 */
export const fetchApiConfig = async (): Promise<ApiConfig | null> => {
  try {
    if (!firestore) {
      // Return default config for development without Firebase
      console.log('⚠️ Using default API config (Firebase not available)');
      return {
        method: 4,
        latitude: 54.15,
        longitude: -4.48,
        timezone: 'Europe/Isle_of_Man',
        offsetMinutes: {
          fajr: 0,
          dhuhr: 0,
          asr: 0,
          maghrib: 0,
          isha: 0,
          school: 0,
        }
      };
    }

    const doc = await firestore()
      .collection(FIREBASE_CONFIG.COLLECTION)
      .doc(FIREBASE_CONFIG.DOCUMENTS.API_CONFIG)
      .get();

    if (!doc.exists) {
      console.error('❌ API config document not found');
      return null;
    }

    const rawData = doc.data();

    // Map the Firebase structure to our ApiConfig type
    const data: ApiConfig = {
      method: rawData?.method || 4,
      latitude: rawData?.latitude || 54.15,
      longitude: rawData?.longitude || -4.48,
      timezone: 'Europe/Isle_of_Man',
      offsetMinutes: {
        fajr: rawData?.offsets?.fajr || 0,
        dhuhr: rawData?.offsets?.dhuhr || 0,
        asr: rawData?.offsets?.asr || 0,
        maghrib: rawData?.offsets?.maghrib || 0,
        isha: rawData?.offsets?.isha || 0,
        school: rawData?.offsets?.school || 0,
      }
    };

    console.log('✅ API config fetched from Firebase');
    return data;
  } catch (error) {
    console.error('❌ Error fetching API config:', error);
    return null;
  }
};

/**
 * Fetch daily configuration from Firebase
 */
export const fetchDailyConfig = async (): Promise<DailyConfig | null> => {
  try {
    if (!firestore) {
      // Return empty config for development without Firebase (will use APT times)
      console.log('⚠️ Using default daily config (Firebase not available)');
      return {
        mat: {
          fajr: '00:00',
          dhuhr: '00:00',
          asr: '00:00',
          maghrib: '00:00',
          isha: '00:00',
        },
        mit: {
          fajr: '00:00',
          dhuhr: '00:00',
          asr: '00:00',
          maghrib: '00:00',
          isha: '00:00',
        },
        specialPrayers: {}
      };
    }

    const doc = await firestore()
      .collection(FIREBASE_CONFIG.COLLECTION)
      .doc(FIREBASE_CONFIG.DOCUMENTS.DAILY_CONFIG)
      .get();

    if (!doc.exists) {
      console.error('❌ Daily config document not found');
      return null;
    }

    const rawData = doc.data();

    if (!rawData?.dailyPrayers) {
      console.error('❌ dailyPrayers field not found');
      return null;
    }

    // Map the Firebase structure (dailyPrayers.fajr.mat/mit) to our DailyConfig type
    const dailyPrayers = rawData.dailyPrayers;
    
    const data: DailyConfig = {
      mat: {
        fajr: dailyPrayers?.fajr?.mat || '00:00',
        dhuhr: dailyPrayers?.dhuhr?.mat || '00:00',
        asr: dailyPrayers?.asr?.mat || '00:00',
        maghrib: dailyPrayers?.maghrib?.mat || '00:00',
        isha: dailyPrayers?.isha?.mat || '00:00',
      },
      mit: {
        fajr: dailyPrayers?.fajr?.mit || '00:00',
        dhuhr: dailyPrayers?.dhuhr?.mit || '00:00',
        asr: dailyPrayers?.asr?.mit || '00:00',
        maghrib: dailyPrayers?.maghrib?.mit || '00:00',
        isha: dailyPrayers?.isha?.mit || '00:00',
      },
      specialPrayers: {
        jumaa: rawData.jumaa ? {
          adhan: rawData.jumaa.adhan_khutba || '',
          iqama: rawData.jumaa.iqama || '',
        } : undefined,
        taraweeh: rawData.taraweeh?.time ? {
          time: rawData.taraweeh.time,
        } : undefined,
        eidAdha: rawData.eid?.adha ? {
          prayer1: rawData.eid.adha.prayer1 || { time: '' },
          prayer2: rawData.eid.adha.prayer2 || { time: '' },
        } : undefined,
        eidFitr: rawData.eid?.fitr ? {
          prayer1: rawData.eid.fitr.prayer1 || { time: '' },
          prayer2: rawData.eid.fitr.prayer2 || { time: '' },
        } : undefined,
      }
    };
    
    console.log('✅ Daily config fetched from Firebase');
    return data;
  } catch (error) {
    console.error('❌ Error fetching daily config:', error);
    return null;
  }
};

/**
 * Fetch announcements from Firebase
 */
export const fetchAnnouncements = async (): Promise<AnnouncementsData | null> => {
  try {
    if (!firestore) {
      // Return empty announcements for development without Firebase
      console.log('⚠️ Using empty announcements (Firebase not available)');
      return { list: [], lastUpdated: null };
    }

    const doc = await firestore()
      .collection(FIREBASE_CONFIG.COLLECTION)
      .doc(FIREBASE_CONFIG.DOCUMENTS.ANNOUNCEMENTS)
      .get();

    if (!doc.exists) {
      console.log('📭 No announcements document found');
      return { list: [], lastUpdated: null };
    }

    const data = doc.data() as AnnouncementsData;
    console.log('✅ Announcements fetched from Firebase');
    return data;
  } catch (error) {
    console.error('❌ Error fetching announcements:', error);
    return { list: [], lastUpdated: null };
  }
};

/**
 * Combine data from all sources into one object
 */
export const fetchAllPrayerData = async (): Promise<CombinedPrayerData | null> => {
  try {
    console.log('🔄 Starting data fetch...');
    
    // Step 1: Fetch API config
    const apiConfig = await fetchApiConfig();
    if (!apiConfig) {
      throw new Error('Failed to fetch API config');
    }
    
    // Step 2: Fetch prayer times from Aladhan
    const today = new Date();
    const aladhanData = await fetchPrayerTimesFromAladhan(
      today,
      apiConfig.method,
      apiConfig.latitude,
      apiConfig.longitude
    );
    
    if (!aladhanData) {
      throw new Error('Failed to fetch prayer times from Aladhan');
    }
    
    // Convert Aladhan timings and apply offsets
    const aptTimings = convertAladhanTimings(aladhanData.timings);
    const aptWithOffsets = {
      fajr: applyTimeOffset(aptTimings.fajr, apiConfig.offsetMinutes.fajr),
      sunrise: aptTimings.sunrise, // No offset for sunrise
      dhuhr: applyTimeOffset(aptTimings.dhuhr, apiConfig.offsetMinutes.dhuhr),
      asr: applyTimeOffset(aptTimings.asr, apiConfig.offsetMinutes.asr),
      maghrib: applyTimeOffset(aptTimings.maghrib, apiConfig.offsetMinutes.maghrib),
      isha: applyTimeOffset(aptTimings.isha, apiConfig.offsetMinutes.isha),
    };
    
    // Step 3: Fetch daily config (MAT/MIT times)
    const dailyConfig = await fetchDailyConfig();
    if (!dailyConfig) {
      throw new Error('Failed to fetch daily config');
    }
    
    // Step 4: Fetch announcements
    const announcementsData = await fetchAnnouncements() || { list: [], lastUpdated: null };
    const announcementsList = announcementsData.list || [];
    
    // Step 5: Build prayers array with smart fallback for MAT/MIT
    // For the 5 main prayers: if MAT is empty, use APT; if MIT is empty, use MAT + 5 mins
    
    const buildPrayer = (
      prayerName: string,
      apt: string,
      mat: string,
      mit: string
    ) => {
      // Check if MAT is empty/missing (empty string or "00:00")
      const isMatEmpty = !mat || mat === '00:00' || mat === '';
      const finalMat = isMatEmpty ? apt : mat;
      
      // Check if MIT is empty/missing
      const isMitEmpty = !mit || mit === '00:00' || mit === '';
      const finalMit = isMitEmpty ? applyTimeOffset(finalMat, 5) : mit;
      
      return {
        name: PRAYER_NAMES[prayerName as keyof typeof PRAYER_NAMES].en,
        nameArabic: PRAYER_NAMES[prayerName as keyof typeof PRAYER_NAMES].ar,
        apt,
        mat: finalMat,
        mit: finalMit,
        isNext: false,
      };
    };
    
    const prayers: Prayer[] = [
      buildPrayer('fajr', aptWithOffsets.fajr, dailyConfig.mat.fajr, dailyConfig.mit.fajr),
      {
        name: PRAYER_NAMES.sunrise.en,
        nameArabic: PRAYER_NAMES.sunrise.ar,
        apt: aptWithOffsets.sunrise,
        mat: '--:--',
        mit: '--:--',
        isNext: false,
      },
      buildPrayer('dhuhr', aptWithOffsets.dhuhr, dailyConfig.mat.dhuhr, dailyConfig.mit.dhuhr),
      buildPrayer('asr', aptWithOffsets.asr, dailyConfig.mat.asr, dailyConfig.mit.asr),
      buildPrayer('maghrib', aptWithOffsets.maghrib, dailyConfig.mat.maghrib, dailyConfig.mit.maghrib),
      buildPrayer('isha', aptWithOffsets.isha, dailyConfig.mat.isha, dailyConfig.mit.isha),
    ];
    
    // Add special prayers if they have values
    // Add Jumaa prayer (Friday prayer - replaces Dhuhr on Fridays)
    if (dailyConfig.specialPrayers.jumaa?.iqama) {
      const jumaaIndex = prayers.findIndex(p => p.name === PRAYER_NAMES.dhuhr.en);
      if (jumaaIndex !== -1) {
        prayers.splice(jumaaIndex + 1, 0, {
          name: PRAYER_NAMES.jumaa.en,
          nameArabic: PRAYER_NAMES.jumaa.ar,
          apt: '--:--',
          mat: dailyConfig.specialPrayers.jumaa.adhan,
          mit: dailyConfig.specialPrayers.jumaa.iqama,
          isNext: false,
        });
      }
    }
    
    // Add Taraweeh prayer (during Ramadan, after Isha)
    if (dailyConfig.specialPrayers.taraweeh?.time) {
      const ishaIndex = prayers.findIndex(p => p.name === PRAYER_NAMES.isha.en);
      if (ishaIndex !== -1) {
        prayers.splice(ishaIndex + 1, 0, {
          name: PRAYER_NAMES.taraweeh.en,
          nameArabic: PRAYER_NAMES.taraweeh.ar,
          apt: '--:--',
          mat: dailyConfig.specialPrayers.taraweeh.time,
          mit: dailyConfig.specialPrayers.taraweeh.time,
          isNext: false,
          isSpecial: true,
        });
      }
    }
    
    // Add Eid al-Fitr prayers (if scheduled)
    if (dailyConfig.specialPrayers.eidFitr?.prayer1?.time) {
      prayers.push({
        name: `${PRAYER_NAMES.eidFitr.en} - Prayer 1`,
        nameArabic: `${PRAYER_NAMES.eidFitr.ar} - صلاة ١`,
        apt: '--:--',
        mat: '--:--',
        mit: dailyConfig.specialPrayers.eidFitr.prayer1.time,
        isNext: false,
        isSpecial: true,
      });
    }
    if (dailyConfig.specialPrayers.eidFitr?.prayer2?.time) {
      prayers.push({
        name: `${PRAYER_NAMES.eidFitr.en} - Prayer 2`,
        nameArabic: `${PRAYER_NAMES.eidFitr.ar} - صلاة ٢`,
        apt: '--:--',
        mat: '--:--',
        mit: dailyConfig.specialPrayers.eidFitr.prayer2.time,
        isNext: false,
        isSpecial: true,
      });
    }
    
    // Add Eid al-Adha prayers (if scheduled)
    if (dailyConfig.specialPrayers.eidAdha?.prayer1?.time) {
      prayers.push({
        name: `${PRAYER_NAMES.eidAdha.en} - Prayer 1`,
        nameArabic: `${PRAYER_NAMES.eidAdha.ar} - صلاة ١`,
        apt: '--:--',
        mat: '--:--',
        mit: dailyConfig.specialPrayers.eidAdha.prayer1.time,
        isNext: false,
        isSpecial: true,
      });
    }
    if (dailyConfig.specialPrayers.eidAdha?.prayer2?.time) {
      prayers.push({
        name: `${PRAYER_NAMES.eidAdha.en} - Prayer 2`,
        nameArabic: `${PRAYER_NAMES.eidAdha.ar} - صلاة ٢`,
        apt: '--:--',
        mat: '--:--',
        mit: dailyConfig.specialPrayers.eidAdha.prayer2.time,
        isNext: false,
        isSpecial: true,
      });
    }
    
    // Find next prayer
    const nextPrayer = getNextPrayer(prayers);
    
    // Mark next prayer
    prayers.forEach(prayer => {
      prayer.isNext = nextPrayer ? prayer.name === nextPrayer.name : false;
    });
    
    // Format dates
    const gregorianDate = formatAladhanGregorianDate(aladhanData.date);
    const hijriDate = formatAladhanHijriDate(aladhanData.date);
    
    const result: CombinedPrayerData = {
      prayers,
      gregorianDate,
      hijriDate,
      announcements: announcementsList,
      lastUpdated: new Date().toISOString(),
      nextPrayer,
      apiConfig,
    };
    
    console.log('✅ All prayer data fetched and combined successfully');
    return result;
  } catch (error) {
    console.error('❌ Error fetching all prayer data:', error);
    return null;
  }
};