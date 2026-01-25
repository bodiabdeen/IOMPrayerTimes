export const Colors = {
  light: {
    primary: '#0A2F35',
    secondary: '#00A86B',      // Changed to darker green
    accent: '#00A86B',         // Changed to darker green
    
    background: '#F5F5F5',
    surface: '#FFFFFF',
    header: '#0A2F35',
    
    text: '#212121',
    textSecondary: '#757575',
    textOnPrimary: '#FFFFFF',
    
    border: '#E0E0E0',
    divider: '#EEEEEE',
    
    success: '#00A86B',        // Darker green
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    
    cardBackground: '#FFFFFF',
    cardBorder: '#E0E0E0',
    nextPrayerBorder: '#00A86B',  // Darker green
    
    announcementNormal: '#E0E0E0',
    announcementImportant: '#FF9800',
    announcementUrgent: '#F44336',
  },
  
  dark: {
    primary: '#00A86B',        // Darker green
    secondary: '#0A2F35',
    accent: '#00A86B',         // Darker green
    
    background: '#121212',
    surface: '#1E1E1E',
    header: '#0A2F35',
    
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textOnPrimary: '#FFFFFF',
    
    border: '#2C2C2C',
    divider: '#2C2C2C',
    
    success: '#00A86B',        // Darker green
    warning: '#FFB74D',
    error: '#EF5350',
    info: '#64B5F6',
    
    cardBackground: '#1E1E1E',
    cardBorder: '#2C2C2C',
    nextPrayerBorder: '#00A86B',  // Darker green
    
    announcementNormal: '#2C2C2C',
    announcementImportant: '#FF9800',
    announcementUrgent: '#F44336',
  },
};

export type Theme = typeof Colors.light;