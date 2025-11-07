import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStudentAssignments, Assignment } from '@/src/services/student';
import { downloadFile, formatFileSize } from '@/src/utils/fileDownload';

export default function AssignmentsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]); // Store original data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('All Status');
  const [sortBy, setSortBy] = useState<'Due Date' | 'Subject'>('Due Date');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      const data = await getStudentAssignments();
      setAllAssignments(data);
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

  // Filter and sort assignments whenever filters change
  useEffect(() => {
    let filtered = [...allAssignments];

    // Apply status filter
    if (selectedStatus !== 'All Status') {
      const statusMap: { [key: string]: string } = {
        'To Do': 'pending',
        'Complete': 'submitted',
        'Graded': 'graded'
      };
      const statusValue = statusMap[selectedStatus] || selectedStatus.toLowerCase();
      filtered = filtered.filter(a => a.status === statusValue);
    }

    // Apply sorting
    if (sortBy === 'Due Date') {
      filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } else if (sortBy === 'Subject') {
      filtered.sort((a, b) => a.subject.localeCompare(b.subject));
    }

    setAssignments(filtered);
  }, [selectedStatus, sortBy, allAssignments]);

  const toggleStatusFilter = () => {
    const statuses = ['All Status', 'To Do', 'Complete', 'Graded'];
    const currentIndex = statuses.indexOf(selectedStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setSelectedStatus(statuses[nextIndex]);
  };

  const toggleSort = () => {
    setSortBy(prev => prev === 'Due Date' ? 'Subject' : 'Due Date');
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

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadAttachment = async (attachment: { path: string; originalName: string }) => {
    try {
      setDownloadingAttachment(attachment.originalName);
      await downloadFile(attachment.path, attachment.originalName);
      Alert.alert('Success', 'File downloaded successfully');
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', error.message || 'Could not download the file');
    } finally {
      setDownloadingAttachment(null);
    }
  };

  const openAssignmentDetail = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
  };

  const closeAssignmentDetail = () => {
    setSelectedAssignment(null);
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
          <TouchableOpacity style={styles.filterButton} onPress={toggleStatusFilter}>
            <Text style={styles.filterButtonText}>{selectedStatus}</Text>
            <Text style={styles.filterIcon}>▼</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton} onPress={toggleSort}>
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
              <TouchableOpacity 
                key={assignment._id} 
                style={styles.assignmentCard}
                onPress={() => openAssignmentDetail(assignment)}
                activeOpacity={0.7}
              >
                <View style={styles.assignmentLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: getStatusBgColor(assignment.status) }]}>
                    <Text style={styles.iconText}>📄</Text>
                  </View>
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentSubject}>{assignment.subject}</Text>
                    <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                    <Text style={styles.assignmentDue}>Due: {formatDueDate(assignment.dueDate)}</Text>
                    {assignment.attachments && assignment.attachments.length > 0 && (
                      <Text style={styles.attachmentIndicator}>
                        📎 {assignment.attachments.length} attachment{assignment.attachments.length > 1 ? 's' : ''}
                      </Text>
                    )}
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
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Assignment Detail Modal */}
      <Modal
        visible={selectedAssignment !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAssignmentDetail}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assignment Details</Text>
              <TouchableOpacity onPress={closeAssignmentDetail} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedAssignment && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Subject</Text>
                  <Text style={styles.detailValue}>{selectedAssignment.subject}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Title</Text>
                  <Text style={styles.detailValue}>{selectedAssignment.title}</Text>
                </View>

                {selectedAssignment.description && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{selectedAssignment.description}</Text>
                  </View>
                )}

                {selectedAssignment.instructions && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Instructions</Text>
                    <Text style={styles.detailValue}>{selectedAssignment.instructions}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Due Date</Text>
                  <Text style={styles.detailValue}>{formatFullDate(selectedAssignment.dueDate)}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(selectedAssignment.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedAssignment.status) }]}>
                      {getStatusLabel(selectedAssignment.status)}
                    </Text>
                  </View>
                </View>

                {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Attachments</Text>
                    {selectedAssignment.attachments.map((attachment, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.attachmentCard}
                        onPress={() => handleDownloadAttachment(attachment)}
                        disabled={downloadingAttachment === attachment.originalName}
                      >
                        <View style={styles.attachmentInfo}>
                          <Text style={styles.attachmentIcon}>📎</Text>
                          <View style={styles.attachmentDetails}>
                            <Text style={styles.attachmentName}>{attachment.originalName}</Text>
                            {attachment.size && (
                              <Text style={styles.attachmentSize}>{formatFileSize(attachment.size)}</Text>
                            )}
                          </View>
                        </View>
                        {downloadingAttachment === attachment.originalName ? (
                          <ActivityIndicator size="small" color="#60A5FA" />
                        ) : (
                          <Text style={styles.downloadIcon}>⬇️</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
    attachmentIndicator: { fontSize: 11, color: isDark ? '#60A5FA' : '#2563EB', marginTop: 4 },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    modalContent: { 
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF', 
      borderTopLeftRadius: 20, 
      borderTopRightRadius: 20, 
      maxHeight: '90%',
      paddingBottom: 20
    },
    modalHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: 20, 
      borderBottomWidth: 1, 
      borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' 
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937' },
    closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#1F2937' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    closeButtonText: { fontSize: 18, color: isDark ? '#E5E7EB' : '#1F2937', fontWeight: '600' },
    modalBody: { flex: 1, padding: 20 },
    detailSection: { marginBottom: 20 },
    detailLabel: { fontSize: 12, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 8, textTransform: 'uppercase' },
    detailValue: { fontSize: 16, color: isDark ? '#E5E7EB' : '#1F2937', lineHeight: 24 },
    attachmentCard: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6', 
      padding: 12, 
      borderRadius: 12, 
      marginBottom: 8 
    },
    attachmentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    attachmentIcon: { fontSize: 20, marginRight: 12 },
    attachmentDetails: { flex: 1 },
    attachmentName: { fontSize: 14, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1F2937', marginBottom: 4 },
    attachmentSize: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' },
    downloadIcon: { fontSize: 20, marginLeft: 8 },
  });
}
