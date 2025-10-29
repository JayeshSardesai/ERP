import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const AssignmentsScreen = () => {
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [sortBy, setSortBy] = useState('Due Date');

  const assignments = [
    {
      id: 1,
      subject: 'English',
      title: 'Essay: The Great Gatsby',
      due: 'Tomorrow, 11:59 PM',
      status: 'To Do',
      statusColor: '#EF4444',
      icon: '📄',
      iconBg: '#FECACA',
    },
    {
      id: 2,
      subject: 'Mathematics',
      title: 'Problem Set5',
      due: 'Yesterday, 5:00 PM',
      status: 'Complete',
      statusColor: '#10B981',
      icon: '✓',
      iconBg: '#D1FAE5',
    },
    {
      id: 3,
      subject: 'English',
      title: 'Midterm Paper',
      due: 'Last week',
      status: 'Graded',
      statusColor: '#8B5CF6',
      icon: '💬',
      iconBg: '#EDE9FE',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Assignments</Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>{selectedStatus}</Text>
            <Text style={styles.filterIcon}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Sort by {sortBy}</Text>
            <Text style={styles.filterIcon}>⇅</Text>
          </TouchableOpacity>
        </View>

        {/* Assignments List */}
        <View style={styles.section}>
          {assignments.map((assignment) => (
            <View key={assignment.id} style={styles.assignmentCard}>
              <View style={styles.assignmentLeft}>
                <View style={[styles.iconContainer, { backgroundColor: assignment.iconBg }]}>
                  <Text style={styles.iconText}>{assignment.icon}</Text>
                </View>
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentSubject}>{assignment.subject}</Text>
                  <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                  <Text style={styles.assignmentDue}>Due: {assignment.due}</Text>
                </View>
              </View>
              <View style={styles.assignmentRight}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(assignment.status) }]}>
                  <Text style={[styles.statusText, { color: assignment.statusColor }]}>
                    {assignment.status}
                  </Text>
                </View>
                {assignment.status === 'To Do' && (
                  <Text style={styles.urgentIndicator}>!</Text>
                )}
              </View>
            </View>
          ))}

          {/* No More Assignments */}
          <View style={styles.noMoreContainer}>
            <Text style={styles.noMoreText}>No more assignment to show.</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const getStatusBgColor = (status: string) => {
  switch (status) {
    case 'To Do':
      return '#FEE2E2';
    case 'Complete':
      return '#D1FAE5';
    case 'Graded':
      return '#EDE9FE';
    default:
      return '#F3F4F6';
  }
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
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  filterIcon: {
    fontSize: 12,
    color: '#1E3A8A',
  },
  section: {
    paddingHorizontal: 20,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  assignmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  assignmentInfo: {
    flex: 1,
  },
  assignmentSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  assignmentTitle: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  assignmentDue: {
    fontSize: 12,
    color: '#6B7280',
  },
  assignmentRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  urgentIndicator: {
    fontSize: 20,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 4,
  },
  noMoreContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
  },
  noMoreText: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
  },
});

export default AssignmentsScreen;
