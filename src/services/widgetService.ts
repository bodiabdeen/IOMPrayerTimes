// src/services/widgetService.ts
import { NativeModules, Platform } from 'react-native';
import { Prayer } from '../types';

const { WidgetModule } = NativeModules;

export const updateWidget = (prayers: Prayer[], nextPrayer: Prayer | null) => {
  // Widget only works on Android
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    if (!WidgetModule) {
      console.error('❌ Widget module not available');
      return;
    }

    // WIDGET SHOWS: 5 main prayers + sunrise ONLY (all have APT from API)
    // Special prayers have APT='--:--' so filtering by APT excludes them automatically
    const mainPrayers = prayers.filter(p => {
      const hasApt = p.apt && p.apt !== '--:--';
      return hasApt;
    });

    console.log('📋 Main prayers for widget:', mainPrayers.map(p => p.name).join(', '));

    if (mainPrayers.length === 0) {
      console.error('❌ No main prayers to display');
      return;
    }

    // Build data object with all main prayer times (APT, MAT, MIT)
    const widgetData: any = {};
    
    mainPrayers.forEach(prayer => {
      const prayerName = prayer.name.toLowerCase();
      // Remove Arabic text from prayer name for the key
      const cleanName = prayerName.split(' ')[0]; // "fajr الفجر" → "fajr"
      widgetData[cleanName] = {
        apt: prayer.apt || '--:--',
        mat: prayer.mat || '--:--',
        mit: prayer.mit || '--:--',
      };
    });

    // Find NEXT PRAYER for countdown (exclude sunrise - it's not a prayer time)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Prayers for countdown (exclude sunrise - name might be "Sunrise الشروق")
    const prayersForCountdown = mainPrayers.filter(p => !p.name.toLowerCase().startsWith('sunrise'));
    
    if (prayersForCountdown.length === 0) {
      console.error('❌ No prayers for countdown');
      return;
    }
    
    let currentPrayerIndex = 0;
    let foundUpcoming = false;
    
    // Find first prayer that hasn't happened yet (using APT only)
    for (let i = 0; i < prayersForCountdown.length; i++) {
      const prayer = prayersForCountdown[i];
      const timeToCheck = prayer.apt;
      
      if (timeToCheck && timeToCheck !== '--:--') {
        const [hours, minutes] = timeToCheck.split(':').map(Number);
        const prayerTime = hours * 60 + minutes;
        
        if (prayerTime > currentTime) {
          currentPrayerIndex = i;
          foundUpcoming = true;
          break;
        }
      }
    }

    // If all prayers passed today, cycle back to first prayer (Fajr for tomorrow)
    if (!foundUpcoming) {
      currentPrayerIndex = 0;
    }

    const currentPrayer = prayersForCountdown[currentPrayerIndex];
    
    // For WIDGET display, find this prayer in the mainPrayers list (which includes sunrise)
    // and show next 3 items from that list (cycling through mainPrayers which includes sunrise)
    const mainPrayerIndex = mainPrayers.findIndex(p => p.name === currentPrayer.name);
    
    if (mainPrayerIndex === -1) {
      console.error('❌ Could not find current prayer in main prayers list');
      return;
    }
    
    const widgetCurrentPrayer = mainPrayers[mainPrayerIndex];
    const widgetNext1Prayer = mainPrayers[(mainPrayerIndex + 1) % mainPrayers.length];
    const widgetNext2Prayer = mainPrayers[(mainPrayerIndex + 2) % mainPrayers.length];

    // Use clean names (without Arabic) for the prayer name keys
    widgetData.currentPrayer = widgetCurrentPrayer.name.split(' ')[0];
    widgetData.next1Prayer = widgetNext1Prayer.name.split(' ')[0];
    widgetData.next2Prayer = widgetNext2Prayer.name.split(' ')[0];

    console.log('📱 Widget Update:', {
      countdown: `${currentPrayer.name} (for countdown)`,
      widgetDisplay: `${widgetCurrentPrayer.name} → ${widgetNext1Prayer.name} → ${widgetNext2Prayer.name}`,
    });

    WidgetModule.updateWidget(widgetData);
    console.log('✅ Widget updated');
  } catch (error) {
    console.error('❌ Error updating widget:', error);
  }
};