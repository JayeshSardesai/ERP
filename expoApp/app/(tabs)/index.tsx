import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoIcon}>🎓</Text>
            <Text style={styles.logoText}>EduLogix</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/menu')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeText}>Hi, Student</Text>
            <Text style={styles.dateText}>17 October 2025, 10:39 PM</Text>
          </View>
          <TouchableOpacity style={styles.sosButton}>
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Announcements</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.announcementCard}>
            <View style={[styles.announcementIcon, { backgroundColor: '#FECACA' }]}>
              <Text style={styles.announcementIconText}>📢</Text>
            </View>
            <View style={styles.announcementContent}>
              <Text style={styles.announcementTitle}>School Reopening - Oct 24</Text>
              <Text style={styles.announcementText}>School reopens on oct 24 after diwali vacations</Text>
            </View>
          </View>

          <View style={styles.announcementCard}>
            <View style={[styles.announcementIcon, { backgroundColor: '#FECACA' }]}>
              <Text style={styles.announcementIconText}>📢</Text>
            </View>
            <View style={styles.announcementContent}>
              <Text style={styles.announcementTitle}>School Reopening - Oct 24</Text>
              <Text style={styles.announcementText}>School reopens on oct 24 after diwali vacations</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Result Analytics</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/results')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.resultAnalyticsCard}>
            <Text style={styles.overallPerformanceTitle}>Overall Performance</Text>
            <View style={styles.performanceCircleContainer}>
              <View style={styles.performanceCircle}>
                <Text style={styles.performancePercentage}>80%</Text>
              </View>
            </View>
          </View>

          <View style={styles.subjectScoresCard}>
            <Text style={styles.subjectScoresTitle}>Subject-wise Scores</Text>
            <Text style={styles.subjectName}>Mathematics</Text>

            <View style={styles.testResultItem}>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: '85%', backgroundColor: '#4ADE80' }]} />
              </View>
              <View style={styles.testResultInfo}>
                <Text style={styles.testResultTitle}>Formative Assessment 1</Text>
                <Text style={styles.testResultScore}>17/20</Text>
              </View>
            </View>

            <View style={styles.testResultItem}>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: '80%', backgroundColor: '#60A5FA' }]} />
              </View>
              <View style={styles.testResultInfo}>
                <Text style={styles.testResultTitle}>Mid Term Examination</Text>
                <Text style={styles.testResultScore}>40/50</Text>
              </View>
            </View>

            <View style={styles.testResultItem}>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: '80%', backgroundColor: '#F87171' }]} />
              </View>
              <View style={styles.testResultInfo}>
                <Text style={styles.testResultTitle}>Formative Assessment 2</Text>
                <Text style={styles.testResultScore}>16/20</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attendance Overview</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/attendance')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.attendanceCard}>
            <View style={styles.attendanceCircleContainer}>
              <View style={styles.attendanceCircle}>
                <Text style={styles.attendancePercentage}>80%</Text>
              </View>
            </View>
            <View style={styles.attendanceStats}>
              <View style={styles.attendanceStat}>
                <View style={[styles.statusDot, { backgroundColor: '#4ADE80' }]} />
                <View>
                  <Text style={styles.attendanceStatLabel}>Attended</Text>
                  <Text style={styles.attendanceStatValue}>160/200 days</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0B0F14' : '#E0F2FE',
    },
    scrollView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 16,
    },
    headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    },
    logoIcon: {
      fontSize: 24,
      marginRight: 8,
    },
    logoText: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E3A8A',
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? '#111827' : '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsIcon: {
      fontSize: 20,
    },
    welcomeSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    welcomeText: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E3A8A',
    },
    dateText: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#1E3A8A',
      marginTop: 4,
    },
    sosButton: {
      backgroundColor: '#EF4444',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
    },
    sosText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    section: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E3A8A',
    },
    viewAllText: {
      fontSize: 14,
      color: '#3B82F6',
      fontWeight: '600',
    },
    announcementCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
    },
    announcementIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    announcementIconText: {
      fontSize: 24,
    },
    announcementContent: {
      flex: 1,
    },
    announcementTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#E5E7EB' : '#1F2937',
      marginBottom: 4,
    },
    announcementText: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    resultAnalyticsCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
      marginBottom: 12,
      alignItems: 'center',
    },
    overallPerformanceTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E3A8A',
      marginBottom: 16,
    },
    performanceCircleContainer: {
      alignItems: 'center',
    },
    performanceCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 12,
      borderColor: '#4ADE80',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#111827' : '#FFFFFF',
    },
    performancePercentage: {
      fontSize: 32,
      fontWeight: '700',
      color: isDark ? '#E5E7EB' : '#1F2937',
    },
    subjectScoresCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
    },
    subjectScoresTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E3A8A',
      marginBottom: 8,
      textAlign: 'center',
    },
    subjectName: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#93C5FD' : '#1E3A8A',
      marginBottom: 12,
    },
    testResultItem: {
      marginBottom: 16,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: isDark ? '#1F2937' : '#E5E7EB',
      borderRadius: 4,
    marginBottom: 8,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
    },
    testResultInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    testResultTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#1F2937',
    },
    testResultScore: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    attendanceCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
      flexDirection: 'row',
      alignItems: 'center',
    },
    attendanceCircleContainer: {
      marginRight: 20,
    },
    attendanceCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 8,
      borderColor: '#4ADE80',
      borderRightColor: '#EF4444',
      borderBottomColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#111827' : '#FFFFFF',
    },
    attendancePercentage: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#E5E7EB' : '#1F2937',
    },
    attendanceStats: {
      flex: 1,
    },
    attendanceStat: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    attendanceStatLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#1F2937',
    },
    attendanceStatValue: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
  },
});
}
