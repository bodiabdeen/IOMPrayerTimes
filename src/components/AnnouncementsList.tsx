import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {Announcement} from '../types';

interface AnnouncementsListProps {
  announcements: Announcement[];
}

export const AnnouncementsList: React.FC<AnnouncementsListProps> = ({
  announcements,
}) => {
  const {theme} = useTheme();

  // Handle undefined or empty announcements
  if (!announcements || announcements.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return theme.announcementUrgent;
      case 'important':
        return theme.announcementImportant;
      default:
        return theme.announcementNormal;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${month} ${day}, ${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, {color: theme.accent}]}>
        Announcements
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {announcements.map((announcement) => (
          <View
            key={announcement.id}
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBackground,
                borderColor: getPriorityColor(announcement.priority),
              },
            ]}>
            {announcement.title && (
              <Text style={[styles.title, {color: theme.text}]}>
                {announcement.title}
              </Text>
            )}
            
            <Text style={[styles.message, {color: theme.textSecondary}]}>
              {announcement.message}
            </Text>
            
            <Text style={[styles.date, {color: theme.textSecondary}]}>
              {formatDate(announcement.createdAt)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 80,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 280,
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 11,
    marginTop: 4,
  },
});