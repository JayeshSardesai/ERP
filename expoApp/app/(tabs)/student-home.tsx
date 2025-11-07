import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStudentMessages, getStudentAssignments, getStudentAttendance } from '@/src/services/student';

export default function StudentHomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const styles = getStyles(isDark);

  const [studentName, setStudentName] = useState('Student');
  const [messages, setMessages] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ presentDays: 0, absentDays: 0, totalDays: 0, attendancePercentage: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [token, userData] = await AsyncStorage.multiGet(['authToken', 'userData']).then(entries => entries.map(e => e[1]));
      if (!token || !userData) {
        router.replace('/login');
        return;
      }

      const user = JSON.parse(userData);
      const displayName = user.name?.displayName || user.name?.firstName || 'Student';
      setStudentName(displayName);

      const [messagesData, assignmentsData, attendanceData] = await Promise.all([
        getStudentMessages(),
        getStudentAssignments(),
        getStudentAttendance()
      ]);

      setMessages(messagesData.slice(0, 3));
      setAssignments(assignmentsData.slice(0, 5));
      setAttendanceStats(attendanceData.stats);
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
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return now.toLocaleString('en-US', options);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={[styles.welcomeText, { marginTop: 12, fontSize: 16 }]}>Loading...</Text>
        </View>
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
            <Text style={styles.logoIcon}>🎓</Text>
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
                <Text style={styles.announcementIconText}>📢</Text>
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
            <Text style={styles.sectionTitle}>Attendance Overview</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/attendance')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.attendanceCard}>
            <View style={styles.attendanceCircleContainer}>
              <View style={[
                styles.attendanceCircle,
                { 
                  borderColor: attendanceStats.totalDays > 0 && attendanceStats.attendancePercentage >= 75 
                    ? '#4ADE80' 
                    : attendanceStats.attendancePercentage >= 50 
                    ? '#F59E0B' 
                    : '#EF4444'
                }
              ]}>
                <Text style={styles.attendancePercentage}>
                  {attendanceStats.totalDays > 0 
                    ? `${Math.round(attendanceStats.attendancePercentage)}%` 
                    : '0%'}
                </Text>
                <Text style={styles.attendanceCircleLabel}>Attendance</Text>
              </View>
            </View>
            <View style={styles.attendanceStats}>
              <View style={styles.attendanceStat}>
                <View style={[styles.statusDot, { backgroundColor: '#4ADE80' }]} />
                <View>
                  <Text style={styles.attendanceStatLabel}>Present</Text>
                  <Text style={styles.attendanceStatValue}>
                    {attendanceStats.presentDays}/{attendanceStats.totalDays} days
                  </Text>
                </View>
              </View>
              <View style={styles.attendanceStat}>
                <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                <View>
                  <Text style={styles.attendanceStatLabel}>Absent</Text>
                  <Text style={styles.attendanceStatValue}>
                    {attendanceStats.absentDays}/{attendanceStats.totalDays} days
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Assignments</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/assignments')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {assignments.length === 0 ? (
            <View style={styles.announcementCard}>
              <View style={[styles.announcementIcon, { backgroundColor: '#E0F2FE' }]}>
                <Text style={styles.announcementIconText}>📄</Text>
              </View>
              <View style={styles.announcementContent}>
                <Text style={styles.announcementTitle}>No Assignments</Text>
                <Text style={styles.announcementText}>You don't have any assignments yet</Text>
              </View>
            </View>
          ) : (
            assignments.map((assignment, index) => (
              <TouchableOpacity 
                key={assignment._id || index} 
                style={styles.announcementCard}
                onPress={() => router.push('/(tabs)/assignments')}
              >
                <View style={[styles.announcementIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={styles.announcementIconText}>📄</Text>
                </View>
                <View style={styles.announcementContent}>
                  <Text style={styles.announcementTitle} numberOfLines={1}>
                    {assignment.subject} - {assignment.title}
                  </Text>
                  <Text style={styles.announcementText} numberOfLines={1}>
                    Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <Text style={[styles.announcementText, { marginTop: 4, fontSize: 11 }]}>
                    Status: {assignment.status === 'pending' ? 'To Do' : 
                             assignment.status === 'submitted' ? 'Complete' : 
                             assignment.status === 'graded' ? 'Graded' : assignment.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
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
      borderWidth: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#111827' : '#FFFFFF',
    },
    attendancePercentage: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#E5E7EB' : '#1F2937',
    },
    attendanceCircleLabel: {
      fontSize: 10,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginTop: 2,
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

