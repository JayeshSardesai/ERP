import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStudentAssignments, Assignment } from '@/src/services/student';

export default function AssignmentsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus] = useState('All Status');
  const [sortBy] = useState('Due Date');

  const fetchAssignments = async () => {
    try {
      const data = await getStudentAssignments();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#EF4444';
      case 'submitted':
        return '#10B981';
      case 'graded':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FEE2E2';
      case 'submitted':
        return '#D1FAE5';
      case 'graded':
        return '#EDE9FE';
      default:
        return '#F3F4F6';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'To Do';
      case 'submitted':
        return 'Complete';
      case 'graded':
        return 'Graded';
      default:
        return status;
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Due Today';
    } else if (diffDays === 1) {
      return 'Due Tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={[styles.filterButtonText, { marginTop: 12 }]}>Loading assignments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Assignments</Text>
        </View>

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

        <View style={styles.section}>
          {assignments.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No assignments found</Text>
            </View>
          ) : (
            assignments.map((assignment) => (
              <View key={assignment._id} style={styles.assignmentCard}>
                <View style={styles.assignmentLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: getStatusBgColor(assignment.status) }]}>
                    <Text style={styles.iconText}>📄</Text>
                  </View>
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentSubject}>{assignment.subject}</Text>
                    <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                    <Text style={styles.assignmentDue}>Due: {formatDueDate(assignment.dueDate)}</Text>
                  </View>
                </View>
                <View style={styles.assignmentRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(assignment.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(assignment.status) }]}>
                      {getStatusLabel(assignment.status)}
                    </Text>
                  </View>
                  {assignment.status === 'pending' && <Text style={styles.urgentIndicator}>!</Text>}
                </View>
              </View>
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
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#E0F2FE' },
    scrollView: { flex: 1 },
    header: { padding: 20, paddingTop: 10 },
    headerTitle: { fontSize: 24, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', textAlign: 'center' },
    filtersContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
    filterButton: { flex: 1, backgroundColor: isDark ? '#0F172A' : '#DBEAFE', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    filterButtonText: { fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A' },
    filterIcon: { fontSize: 12, color: isDark ? '#93C5FD' : '#1E3A8A' },
    section: { paddingHorizontal: 20 },
    assignmentCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    assignmentLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    iconText: { fontSize: 24 },
    assignmentInfo: { flex: 1 },
    assignmentSubject: { fontSize: 16, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937', marginBottom: 2 },
    assignmentTitle: { fontSize: 14, color: isDark ? '#E5E7EB' : '#1F2937', marginBottom: 4 },
    assignmentDue: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' },
    assignmentRight: { alignItems: 'flex-end' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: '600' },
    urgentIndicator: { fontSize: 20, color: '#EF4444', fontWeight: '700', marginTop: 4 },
    noDataContainer: { alignItems: 'center', marginTop: 40, paddingVertical: 40 },
    noDataText: { fontSize: 16, color: isDark ? '#93C5FD' : '#1E3A8A', fontWeight: '600' },
  });
}
