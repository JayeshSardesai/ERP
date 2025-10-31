import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const AttendanceScreen = () => {
  const [selectedDate, setSelectedDate] = useState(17);

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // October 2025 calendar data
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
    const styles: any = [calendarStyles.dateText];
    
    if (day.month !== 'current') {
      styles.push(calendarStyles.otherMonthText);
    }
    
    if (day.status === 'present') {
      styles.push(calendarStyles.presentText);
    } else if (day.status === 'absent') {
      styles.push(calendarStyles.absentText);
    } else if (day.status === 'no-class') {
      styles.push(calendarStyles.noClassText);
    }
    
    return styles;
  };

  const getDateContainerStyle = (day: any) => {
    const styles: any = [calendarStyles.dateContainer];
    
    if (day.day === selectedDate && day.month === 'current') {
      styles.push(calendarStyles.selectedDate);
    }
    
    return styles;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>17 October 2025, 10:39 PM</Text>
        </View>

        {/* Calendar Card */}
        <View style={styles.section}>
          <View style={styles.calendarCard}>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.navButton}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthYear}>October 2025</Text>
              <TouchableOpacity style={styles.navButton}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Days of Week */}
            <View style={calendarStyles.daysOfWeekContainer}>
              {daysOfWeek.map((day, index) => (
                <View key={index} style={calendarStyles.dayOfWeekCell}>
                  <Text style={calendarStyles.dayOfWeekText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={calendarStyles.calendarGrid}>
              {calendarDays.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={getDateContainerStyle(day)}
                  onPress={() => day.month === 'current' && setSelectedDate(day.day)}
                >
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

            {/* Legend */}
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

            {/* Session Info */}
            <Text style={styles.sessionInfo}>
              Left Dot: Morning, Right Dot: Afternoon
            </Text>
          </View>
        </View>

        {/* Attendance Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.attendanceCircleContainer}>
              <View style={styles.attendanceCircle}>
                {/* This would be an SVG circle in production */}
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#1E3A8A',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 24,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  sessionInfo: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#93C5FD',
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
    backgroundColor: '#FFFFFF',
  },
  circleInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendancePercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  attendanceStats: {
    flex: 1,
  },
  attendanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#1F2937',
  },
  attendanceStatValue: {
    fontSize: 12,
    color: '#6B7280',
  },
});

const calendarStyles = StyleSheet.create({
  daysOfWeekContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayOfWeekText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateContainer: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  selectedDate: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  otherMonthText: {
    color: '#D1D5DB',
  },
  presentText: {
    color: '#16A34A',
  },
  absentText: {
    color: '#DC2626',
  },
  noClassText: {
    color: '#9CA3AF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

export default AttendanceScreen;
