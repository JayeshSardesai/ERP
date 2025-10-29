import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ActivityScreen = () => {
  const activities = [
    {
      id: 1,
      title: 'New Assignment:...',
      subtitle: 'History 101 - Due:2025-10-15',
      time: '2 hours ago',
      icon: '📄',
      iconBg: '#DBEAFE',
    },
    {
      id: 2,
      title: 'Grade for Mid-term Exa...',
      subtitle: 'Biology 202',
      time: 'Yesterday',
      icon: '✓',
      iconBg: '#D1FAE5',
    },
    {
      id: 3,
      title: 'Reminder: Lab Report is...',
      subtitle: 'Chemistry Lab - Due in 2 days',
      time: 'Yesterday',
      icon: '🔔',
      iconBg: '#FED7AA',
    },
    {
      id: 4,
      title: 'Announcement from...',
      subtitle: 'Literature 301 - Class cancelles on Friday',
      time: '2 days ago',
      icon: '📢',
      iconBg: '#E9D5FF',
    },
    {
      id: 5,
      title: 'New Reading: The Great...',
      subtitle: 'Literature 301 - Chapters 1-3',
      time: '3 days ago',
      icon: '📖',
      iconBg: '#DBEAFE',
    },
    {
      id: 6,
      title: 'Quiz 2 Graded',
      subtitle: 'History 101',
      time: '4 days ago',
      icon: '✓',
      iconBg: '#D1FAE5',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Activity</Text>
        </View>

        {/* Activity List */}
        <View style={styles.section}>
          {activities.map((activity) => (
            <View key={activity.id} style={styles.activityCard}>
              <View style={[styles.iconContainer, { backgroundColor: activity.iconBg }]}>
                <Text style={styles.iconText}>{activity.icon}</Text>
              </View>
              <View style={styles.activityContent}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
                <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2FE',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default ActivityScreen;
