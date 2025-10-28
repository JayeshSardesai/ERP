import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AttendanceScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);
  const calendarStyles = getCalendarStyles(isDark);

  const [selectedDate, setSelectedDate] = useState(17);
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const calendarDays = [
    { day: 28, month: 'prev', status: null },
    { day: 29, month: 'prev', status: null },
    { day: 30, month: 'prev', status: null },
    { day: 1, month: 'current', status: 'present' },
    { day: 2, month: 'current', status: 'present' },
    { day: 3, month: 'current', status: 'present' },
    { day: 4, month: 'current', status: 'present' },
    { day: 5, month: 'current', status: 'present' },
    { day: 6, month: 'current', status: 'present' },
    { day: 7, month: 'current', status: 'present' },
    { day: 8, month: 'current', status: 'present' },
    { day: 9, month: 'current', status: 'absent' },
    { day: 10, month: 'current', status: 'present' },
    { day: 11, month: 'current', status: 'present' },
    { day: 12, month: 'current', status: 'present' },
    { day: 13, month: 'current', status: 'present' },
    { day: 14, month: 'current', status: 'present' },
    { day: 15, month: 'current', status: 'present' },
    { day: 16, month: 'current', status: 'present' },
    { day: 17, month: 'current', status: 'present' },
    { day: 18, month: 'current', status: 'present' },
    { day: 19, month: 'current', status: 'no-class' },
    { day: 20, month: 'current', status: 'no-class' },
    { day: 21, month: 'current', status: 'no-class' },
    { day: 22, month: 'current', status: 'no-class' },
    { day: 23, month: 'current', status: 'no-class' },
    { day: 24, month: 'current', status: 'no-class' },
    { day: 25, month: 'current', status: 'no-class' },
    { day: 26, month: 'current', status: 'no-class' },
    { day: 27, month: 'current', status: 'no-class' },
    { day: 28, month: 'current', status: 'no-class' },
    { day: 29, month: 'current', status: 'no-class' },
    { day: 30, month: 'current', status: 'no-class' },
    { day: 31, month: 'current', status: 'no-class' },
    { day: 1, month: 'next', status: null },
  ];

  const getDateStyle = (day: any) => {
    const composed: any = [calendarStyles.dateText];
    if (day.month !== 'current') composed.push(calendarStyles.otherMonthText);
    if (day.status === 'present') composed.push(calendarStyles.presentText);
    else if (day.status === 'absent') composed.push(calendarStyles.absentText);
    else if (day.status === 'no-class') composed.push(calendarStyles.noClassText);
    return composed;
  };

  const getDateContainerStyle = (day: any) => {
    const composed: any = [calendarStyles.dateContainer];
    if (day.day === selectedDate && day.month === 'current') composed.push(calendarStyles.selectedDate);
    return composed;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>17 October 2025, 10:39 PM</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.navButton}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthYear}>October 2025</Text>
              <TouchableOpacity style={styles.navButton}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={calendarStyles.daysOfWeekContainer}>
              {daysOfWeek.map((day, index) => (
                <View key={index} style={calendarStyles.dayOfWeekCell}>
                  <Text style={calendarStyles.dayOfWeekText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={calendarStyles.calendarGrid}>
              {calendarDays.map((day, index) => (
                <TouchableOpacity key={index} style={getDateContainerStyle(day)} onPress={() => day.month === 'current' && setSelectedDate(day.day)}>
                  <Text style={getDateStyle(day)}>{day.day}</Text>
                  {day.status === 'present' && day.month === 'current' && (
                    <View style={calendarStyles.statusDot}>
                      <View style={[calendarStyles.dot, { backgroundColor: '#4ADE80' }]} />
                    </View>
                  )}
                  {day.status === 'absent' && day.month === 'current' && (
                    <View style={calendarStyles.statusDot}>
                      <View style={[calendarStyles.dot, { backgroundColor: '#EF4444' }]} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4ADE80' }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#D1D5DB' }]} />
                <Text style={styles.legendText}>No Class</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sessionInfo}>Left Dot: Morning, Right Dot: Afternoon</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.attendanceCircleContainer}>
              <View style={styles.attendanceCircle}>
                <View style={styles.circleInner}>
                  <Text style={styles.attendancePercentage}>80%</Text>
                </View>
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
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#E0F2FE' },
    scrollView: { flex: 1 },
    header: { padding: 20, paddingTop: 10, alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A' },
    headerSubtitle: { fontSize: 14, color: isDark ? '#9CA3AF' : '#1E3A8A', marginTop: 4 },
    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 12 },
    calendarCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    navButton: { padding: 8 },
    navButtonText: { fontSize: 24, color: isDark ? '#93C5FD' : '#1E3A8A', fontWeight: '600' },
    monthYear: { fontSize: 18, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A' },
    legendContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
    legendText: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '500' },
    divider: { height: 1, backgroundColor: isDark ? '#1F2937' : '#E5E7EB', marginVertical: 12 },
    sessionInfo: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' },
    overviewCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD', flexDirection: 'row', alignItems: 'center' },
    attendanceCircleContainer: { marginRight: 20 },
    attendanceCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: '#4ADE80', borderRightColor: '#EF4444', borderBottomColor: '#EF4444', justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#111827' : '#FFFFFF' },
    circleInner: { justifyContent: 'center', alignItems: 'center' },
    attendancePercentage: { fontSize: 24, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937' },
    attendanceStats: { flex: 1 },
    attendanceStat: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
    attendanceStatLabel: { fontSize: 14, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1F2937' },
    attendanceStatValue: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' },
  });
}

function getCalendarStyles(isDark: boolean) {
  return StyleSheet.create({
    daysOfWeekContainer: { flexDirection: 'row', marginBottom: 8 },
    dayOfWeekCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    dayOfWeekText: { fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dateContainer: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 4 },
    selectedDate: { backgroundColor: isDark ? '#1F2937' : '#DBEAFE', borderRadius: 8 },
    dateText: { fontSize: 14, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1F2937' },
    otherMonthText: { color: isDark ? '#374151' : '#D1D5DB' },
    presentText: { color: '#16A34A' },
    absentText: { color: '#DC2626' },
    noClassText: { color: '#9CA3AF' },
    statusDot: { position: 'absolute', bottom: 4, flexDirection: 'row', gap: 2 },
    dot: { width: 4, height: 4, borderRadius: 2 },
  });
}


