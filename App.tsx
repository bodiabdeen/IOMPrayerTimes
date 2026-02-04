import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';
import {Header} from './src/components/Header';
import {DateDisplay} from './src/components/DateDisplay';
import {CountdownTimer} from './src/components/CountdownTimer';
import {PrayerTimesTable} from './src/components/PrayerTimesTable';
import {AnnouncementsModal} from './src/components/AnnouncementsModal';
import {LoadingSpinner} from './src/components/LoadingSpinner';
import {ConfigInfo} from './src/components/ConfigInfo';
import {fetchAllPrayerData} from './src/services/firebaseService';
import {loadCachedData, saveCachedData} from './src/services/cacheService';
import {updateWidget} from './src/services/widgetService';
import {
  initializeNotifications,
  scheduleAllPrayerNotifications,
  showDataRefreshedNotification,
  showUnreadAnnouncementsNotification,
  getNotificationPreferences,
} from './src/services/notificationService';
import {getNextPrayer} from './src/utils/prayerUtils';
import {CombinedPrayerData} from './src/types';

// Auto-refresh interval: 6 hours (in milliseconds)
const AUTO_REFRESH_INTERVAL = 6 * 60 * 60 * 1000;

function AppContent(): React.JSX.Element {
  const {theme, timeFormat, toggleTimeFormat} = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prayerData, setPrayerData] = useState<CombinedPrayerData | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentNextPrayer, setCurrentNextPrayer] = useState<typeof prayerData extends {prayers: any[]} ? ReturnType<typeof getNextPrayer> : null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    console.log('🚀 Initializing app...');
    initializeApp();

    // Set up auto-refresh interval
    const intervalId = setInterval(() => {
      console.log('⏰ Auto-refresh triggered (every 6 hours)');
      fetchFreshData();
    }, AUTO_REFRESH_INTERVAL);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const initializeApp = async () => {
    // Initialize notifications
    const hasPermission = await initializeNotifications();
    setNotificationsEnabled(hasPermission);
    
    if (!hasPermission) {
      // Ask for permission after a short delay
      setTimeout(() => {
        Alert.alert(
          'Enable Notifications',
          'Get notified at prayer times (APT, Adhan, Iqama), sunrise, and for new announcements.',
          [
            {text: 'Not Now', style: 'cancel'},
            {text: 'Enable', onPress: async () => {
              const granted = await initializeNotifications();
              setNotificationsEnabled(granted);
            }},
          ]
        );
      }, 2000);
    }

    loadInitialData();
  };

  useEffect(() => {
    if (prayerData?.announcements) {
      calculateUnreadCount();
    }
    if (prayerData?.prayers) {
      const nextPrayer = getNextPrayer(prayerData.prayers);
      setCurrentNextPrayer(nextPrayer);
      
      // Update widget whenever prayer data changes
      updateWidget(prayerData.prayers, nextPrayer);
      
      // Schedule all prayer notifications (APT, MAT, MIT for each prayer)
      if (notificationsEnabled) {
        scheduleAllPrayerNotifications(prayerData.prayers);
      }
    }
  }, [prayerData, notificationsEnabled]);

  const calculateUnreadCount = async () => {
    try {
      const stored = await AsyncStorage.getItem('@read_announcements');
      const readIds = stored ? new Set(JSON.parse(stored)) : new Set();
      const unread = prayerData?.announcements.filter(a => !readIds.has(a.id)).length || 0;
      setUnreadCount(unread);
      
      // Show notification for unread announcements
      if (notificationsEnabled && unread > 0) {
        const prefs = await getNotificationPreferences();
        if (prefs.announcements) {
          showUnreadAnnouncementsNotification(unread);
        }
      }
    } catch (error) {
      console.error('Error calculating unread count:', error);
    }
  };

  const normalizeData = (data: any): CombinedPrayerData => {
    // Handle announcements - could be either:
    // 1. An array (from cache/old data): Announcement[]
    // 2. An object (from Firebase): {list: Announcement[], lastUpdated: string}
    let announcementsList: any[] = [];
    if (Array.isArray(data.announcements)) {
      // Already an array - use it directly
      announcementsList = data.announcements;
    } else if (data.announcements?.list && Array.isArray(data.announcements.list)) {
      // Object with list property - extract the list
      announcementsList = data.announcements.list;
    }
    
    return {
      prayers: Array.isArray(data.prayers) ? data.prayers : [],
      gregorianDate: data.gregorianDate || '',
      hijriDate: data.hijriDate || '',
      announcements: announcementsList,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      apiConfig: data.apiConfig || null,
    };
  };

  const loadInitialData = async () => {
    try {
      const cached = await loadCachedData();
      if (cached) {
        console.log('📦 Using cached data for initial display');
        const normalized = normalizeData(cached);
        setPrayerData(normalized);
        setIsLoading(false);
      }

      await fetchFreshData();
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      setIsLoading(false);
    }
  };

  const fetchFreshData = async () => {
    try {
      console.log('🌐 Fetching fresh data...');
      const data = await fetchAllPrayerData();
      
      if (data) {
        console.log('✅ Fresh data loaded');
        const normalized = normalizeData(data);
        setPrayerData(normalized);
        await saveCachedData(normalized);
        setIsOffline(false);
        
        // Show refresh notification if enabled
        if (notificationsEnabled) {
          const prefs = await getNotificationPreferences();
          if (prefs.dataRefresh) {
            showDataRefreshedNotification();
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching fresh data:', error);
      setIsOffline(true);
      
      if (!prayerData) {
        Alert.alert(
          'Connection Error',
          'Unable to load prayer times. Please check your internet connection.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchFreshData();
    } catch (error) {
      Alert.alert('Refresh Failed', 'Unable to update prayer times.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: theme.background}]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!prayerData) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: theme.background}]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, {color: theme.text}]}>
            Unable to load prayer times
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, {backgroundColor: theme.accent}]}
            onPress={loadInitialData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  const handleNextPrayerChange = (prayer: typeof currentNextPrayer) => {
    setCurrentNextPrayer(prayer);
    // Update widget when next prayer changes
    if (prayerData?.prayers && prayer) {
      updateWidget(prayerData.prayers, prayer);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.background}]}>
      <Header />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }>
        <DateDisplay
          gregorianDate={prayerData.gregorianDate}
          hijriDate={prayerData.hijriDate}
        />

        <CountdownTimer 
          nextPrayer={currentNextPrayer} 
          prayers={prayerData.prayers}
          onNextPrayerChange={handleNextPrayerChange}
        />

        <PrayerTimesTable
          prayers={prayerData.prayers}
          nextPrayerName={currentNextPrayer?.name || null}
        />

        <ConfigInfo config={prayerData.apiConfig || null} />

        <View style={{height: 140}} />
      </ScrollView>

      {/* Announcements Button (Bottom Left) */}
      <TouchableOpacity
        style={[styles.announcementButton, {backgroundColor: theme.accent}]}
        onPress={() => setShowAnnouncements(true)}
        activeOpacity={0.8}>
        <Text style={styles.bellIcon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={[styles.badge, {backgroundColor: theme.error}]}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 12h/24h Toggle Button (Bottom Right, above Refresh) */}
      <TouchableOpacity
        style={[styles.timeFormatButton, {
          backgroundColor: theme.cardBackground,
          borderColor: theme.accent,
        }]}
        onPress={toggleTimeFormat}
        activeOpacity={0.8}>
        <Text style={[styles.timeFormatText, {color: theme.accent}]}>
          {timeFormat === '24h' ? '12h' : '24h'}
        </Text>
      </TouchableOpacity>

      {/* Refresh Button (Bottom Right) */}
      <TouchableOpacity
        style={[styles.refreshButton, {
          backgroundColor: theme.accent,
        }]}
        onPress={handleRefresh}
        activeOpacity={0.8}>
        <Text style={styles.refreshIcon}>↻</Text>
      </TouchableOpacity>

      {isOffline && (
        <View style={[styles.offlineBanner, {backgroundColor: theme.warning}]}>
          <Text style={styles.offlineText}>
            ⚠️ Offline - Showing cached data
          </Text>
        </View>
      )}

      <AnnouncementsModal
        visible={showAnnouncements}
        onClose={() => {
          setShowAnnouncements(false);
          calculateUnreadCount();
        }}
        announcements={prayerData.announcements}
      />
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  announcementButton: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeFormatButton: {
    position: 'absolute',
    right: 16,
    bottom: 88,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  timeFormatText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  refreshIcon: {
    fontSize: 32,
    lineHeight: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center',
      height: 30,
    }),
  },
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default App;