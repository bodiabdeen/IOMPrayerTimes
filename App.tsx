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
import {getNextPrayer} from './src/utils/prayerUtils';
import {CombinedPrayerData} from './src/types';

function AppContent(): React.JSX.Element {
  const {theme} = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prayerData, setPrayerData] = useState<CombinedPrayerData | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentNextPrayer, setCurrentNextPrayer] = useState<typeof prayerData extends {prayers: any[]} ? ReturnType<typeof getNextPrayer> : null>(null);

  useEffect(() => {
    console.log('🚀 Initializing app...');
    loadInitialData();
  }, []);

  useEffect(() => {
    if (prayerData?.announcements) {
      calculateUnreadCount();
    }
    if (prayerData?.prayers) {
      const nextPrayer = getNextPrayer(prayerData.prayers);
      setCurrentNextPrayer(nextPrayer);
      // Update widget whenever prayer data changes
      updateWidget(prayerData.prayers, nextPrayer);
    }
  }, [prayerData]);

  const calculateUnreadCount = async () => {
    try {
      const stored = await AsyncStorage.getItem('@read_announcements');
      const readIds = stored ? new Set(JSON.parse(stored)) : new Set();
      const unread = prayerData?.announcements.filter(a => !readIds.has(a.id)).length || 0;
      setUnreadCount(unread);
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

        <View style={{height: 100}} />
      </ScrollView>

      {/* Announcements Button */}
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

      {/* Refresh Button */}
      <TouchableOpacity
        style={[styles.refreshButton, {
          backgroundColor: theme.cardBackground,
          borderColor: theme.accent,
        }]}
        onPress={handleRefresh}
        activeOpacity={0.8}>
        <Text style={[styles.refreshIcon, {color: theme.accent}]}>↻</Text>
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
  refreshButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  refreshIcon: {
    fontSize: 32,
    fontWeight: 'bold',
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