import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStudentMessages, getStudentAssignments, getStudentAttendance, getStudentResults } from '@/src/services/student';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const styles = getStyles(isDark);

  const [studentName, setStudentName] = useState('Student');
  const [messages, setMessages] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ attendancePercentage: 0, presentDays: 0, totalDays: 0 });
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      // Ensure session exists before fetching
      const [token, userData] = await AsyncStorage.multiGet(['authToken', 'userData']).then(entries => entries.map(e => e[1]));
      if (!token || !userData) {
        // Not logged in yet – send to login and stop
        router.replace('/login');
        return;
      }

      // Get student info
      const user = JSON.parse(userData);
      const displayName = user.name?.displayName || user.name?.firstName || 'Student';
      setStudentName(displayName);

      // Fetch all student data (now authenticated)
      // For home page, fetch current month's attendance to ensure we get today's data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      console.log('[HOME] Fetching attendance for range:', startOfMonth, 'to', endOfMonth);

      const [messagesData, assignmentsData, attendanceData, resultsData] = await Promise.all([
        getStudentMessages(),
        getStudentAssignments(),
        getStudentAttendance(startOfMonth, endOfMonth),
        getStudentResults()
      ]);

      setMessages(messagesData.slice(0, 3));
      setAssignments(assignmentsData.slice(0, 3));
      setAttendanceStats(attendanceData.stats);

      // Get today's attendance using local date formatting
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      console.log('[HOME] Looking for today\'s attendance:', today);

      const todayRecord = attendanceData.records.find(record => {
        const recordDateStr = record.dateString || record.date?.split('T')[0];
        console.log('[HOME] Comparing record date:', recordDateStr, 'with today:', today);
        return recordDateStr === today;
      });

      console.log('[HOME] Today\'s attendance record:', todayRecord ? 'Found' : 'Not found');
      setTodayAttendance(todayRecord);

      setResults(resultsData.slice(0, 3));
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoIcon}
              tintColor={isDark ? '#FFFFFF' : '#000000'}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>EduLogix</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/menu')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeText}>Hi, {studentName}</Text>
            <Text style={styles.dateText}>{getCurrentDateTime()}</Text>
          </View>
          <TouchableOpacity style={styles.sosButton}>
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Messages</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/activity')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {messages.length === 0 ? (
            <View style={styles.announcementCard}>
              <View style={[styles.announcementIcon, { backgroundColor: '#E0F2FE' }]}>
                <Text style={styles.announcementIconText}>�</Text>
              </View>
              <View style={styles.announcementContent}>
                <Text style={styles.announcementTitle}>No Messages</Text>
                <Text style={styles.announcementText}>You don't have any messages yet</Text>
              </View>
            </View>
          ) : (
            messages.map((msg, index) => (
              <View key={msg._id || index} style={styles.announcementCard}>
                <View style={[styles.announcementIcon, { backgroundColor: '#FECACA' }]}>
                  <Text style={styles.announcementIconText}>📢</Text>
                </View>
                <View style={styles.announcementContent}>
                  <Text style={styles.announcementTitle} numberOfLines={1}>{msg.subject || msg.title}</Text>
                  <Text style={styles.announcementText} numberOfLines={2}>{msg.message}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Result Analytics</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/results')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {results.length > 0 ? (
            <>
              <View style={styles.resultAnalyticsCard}>
                <Text style={styles.overallPerformanceTitle}>Overall Performance</Text>
                <View style={styles.performanceCircleContainer}>
                  <View style={styles.performanceCircle}>
                    <Text style={styles.performancePercentage}>
                      {Math.round(results[0]?.overallPercentage || 0)}%
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.subjectScoresCard}>
                <Text style={styles.subjectScoresTitle}>Recent Test Results</Text>
                {results.slice(0, 3).map((result, index) => (
                  <View key={result._id || index} style={styles.testResultItem}>
                    <View style={styles.progressBarContainer}>
                      <View style={[
                        styles.progressBar,
                        {
                          width: `${Math.min(result.overallPercentage || 0, 100)}%`,
                          backgroundColor: result.overallPercentage >= 80 ? '#4ADE80' :
                            result.overallPercentage >= 60 ? '#60A5FA' : '#F87171'
                        }
                      ]} />
                    </View>
                    <View style={styles.testResultInfo}>
                      <Text style={styles.testResultTitle}>{result.examType}</Text>
                      <Text style={styles.testResultScore}>
                        {result.overallPercentage?.toFixed(1)}% • {result.overallGrade || 'N/A'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.resultAnalyticsCard}>
              <Text style={styles.overallPerformanceTitle}>No Results Available</Text>
              <Text style={styles.announcementText}>Your test results will appear here once available</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Attendance</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/attendance')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.todayAttendanceCard}>
            <View style={styles.todayAttendanceHeader}>
              <Text style={styles.todayAttendanceTitle}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            {todayAttendance ? (
              <View style={styles.sessionsContainer}>
                <View style={styles.sessionItem}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionLabel}>Morning</Text>
                    <Text style={styles.sessionTime}>8:00 AM - 12:00 PM</Text>
                  </View>
                  <View style={[styles.sessionDot, {
                    backgroundColor: todayAttendance?.sessions?.morning?.status === 'present' ? '#4ADE80' :
                      todayAttendance?.sessions?.morning?.status === 'absent' ? '#EF4444' : '#D1D5DB'
                  }]} />
                </View>
                <View style={styles.sessionItem}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionLabel}>Afternoon</Text>
                    <Text style={styles.sessionTime}>1:00 PM - 4:00 PM</Text>
                  </View>
                  <View style={[styles.sessionDot, {
                    backgroundColor: todayAttendance?.sessions?.afternoon?.status === 'present' ? '#4ADE80' :
                      todayAttendance?.sessions?.afternoon?.status === 'absent' ? '#EF4444' : '#D1D5DB'
                  }]} />
                </View>
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No attendance marked for today</Text>
                <Text style={styles.noDataSubtext}>Attendance will appear here once marked by your teacher</Text>
              </View>
            )}
          </View>

          <View style={styles.attendanceCard}>
            <View style={styles.attendanceCircleContainer}>
              <View style={styles.attendanceCircle}>
                <Text style={styles.attendancePercentage}>
                  {Math.round(attendanceStats.attendancePercentage || 0)}%
                </Text>
              </View>
            </View>
            <View style={styles.attendanceStats}>
              <View style={styles.attendanceStat}>
                <View style={[styles.statusDot, { backgroundColor: '#4ADE80' }]} />
                <View>
                  <Text style={styles.attendanceStatLabel}>Overall Attendance</Text>
                  <Text style={styles.attendanceStatValue}>
                    {attendanceStats.presentDays || 0}/{attendanceStats.totalDays || 0} days
                  </Text>
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
      width: 24,
      height: 24,
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
    todayAttendanceCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
      marginBottom: 12,
    },
    todayAttendanceHeader: {
      marginBottom: 16,
    },
    todayAttendanceTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E3A8A',
      textAlign: 'center',
    },
    sessionsContainer: {
      gap: 12,
    },
    sessionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    sessionInfo: {
      flex: 1,
    },
    sessionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#1F2937',
    },
    sessionTime: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginTop: 2,
    },
    sessionDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    noDataContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    noDataText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 4,
    },
    noDataSubtext: {
      fontSize: 12,
      color: isDark ? '#6B7280' : '#9CA3AF',
      textAlign: 'center',
    },
  });
}
