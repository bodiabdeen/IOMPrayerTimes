import {Prayer} from '../types';

export const getNextPrayer = (prayers: Prayer[]): Prayer | null => {
  if (!prayers || prayers.length === 0) {
    console.log('⚠️ No prayers provided to getNextPrayer');
    return null;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // COUNTDOWN: Only 5 main prayers (Fajr, Dhuhr, Asr, Maghrib, Isha)
  // Exclude: Sunrise (not a prayer), Special prayers (have APT='--:--')
  const mainPrayers = prayers.filter(
    prayer => {
      if (!prayer || !prayer.name) return false;
      
      // Exclude sunrise (name might be "Sunrise الشروق" so use startsWith)
      if (prayer.name.toLowerCase().startsWith('sunrise')) return false;
      
      // MUST have APT from API (main prayers have APT, special prayers don't)
      const hasApt = prayer.apt && prayer.apt !== '--:--';
      
      return hasApt;
    }
  );

  console.log('🕌 Main prayers for countdown:', mainPrayers.map(p => p.name).join(', '));

  // Find first prayer where APT hasn't passed yet
  for (const prayer of mainPrayers) {
    try {
      const timeToUse = prayer.apt; // Always use APT for countdown
      
      if (!timeToUse || timeToUse === '--:--') continue;
      
      const [hours, minutes] = timeToUse.split(':').map(Number);
      const prayerTime = hours * 60 + minutes;

      if (prayerTime > currentTime) {
        console.log(`🕌 Next prayer: ${prayer.name} at APT ${timeToUse}`);
        return prayer;
      }
    } catch (error) {
      console.error(`❌ Error parsing prayer time for ${prayer.name}:`, error);
      continue;
    }
  }

  // If all prayers passed today, return Fajr for tomorrow (same APT time)
  // Name might be "Fajr الفجر" so use startsWith
  const fajr = mainPrayers.find(p => p.name && p.name.toLowerCase().startsWith('fajr'));
  if (fajr) {
    console.log('🕌 All prayers passed today - Next prayer: Fajr (tomorrow at APT ' + fajr.apt + ')');
    return fajr;
  }

  console.log('⚠️ Could not determine next prayer');
  return null;
};