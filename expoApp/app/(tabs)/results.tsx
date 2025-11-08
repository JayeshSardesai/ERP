import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStudentResults, Result } from '@/src/services/student';
import { getClasses, getStudentsByClassSection, getClassSubjects, Student } from '@/src/services/teacher';
import { usePermissions } from '@/src/hooks/usePermissions';
import api from '@/src/services/api';

export default function ResultsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);
  const { hasPermission } = usePermissions();

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  
  // Teacher-specific state
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTestType, setSelectedTestType] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<string>('100');
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentMarks, setStudentMarks] = useState<{[key: string]: string}>({});
  const [existingResults, setExistingResults] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [schoolCode, setSchoolCode] = useState<string>('');
  
  // Dropdown modal states
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [showSectionModal, setShowSectionModal] = useState<boolean>(false);
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [showTestTypeModal, setShowTestTypeModal] = useState<boolean>(false);
  
  const testTypes = ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2', 'Mid Term', 'Final Term'];

  const checkRole = async () => {
    try {
      const role = await AsyncStorage.getItem('role');
      const code = await AsyncStorage.getItem('schoolCode');
      console.log('[RESULTS] Role:', role, 'SchoolCode:', code);
      setIsTeacher(role === 'teacher');
      setSchoolCode(code || '');
      
      if (role === 'teacher') {
        console.log('[RESULTS] Fetching classes for teacher...');
        const classData = await getClasses();
        console.log('[RESULTS] Fetched classes:', classData.length, classData);
        setClasses(classData);
      }
    } catch (error) {
      console.error('[RESULTS] Error checking role:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const role = await AsyncStorage.getItem('role');
      
      if (role === 'teacher') {
        // Teacher view - handled separately
        setLoading(false);
        setRefreshing(false);
      } else {
        // Student: fetch own results
        const data = await getStudentResults();
        setResults(data);
        setLoading(false);
        setRefreshing(false);
      }
    } catch (error) {
      console.error('[RESULTS] Error fetching results:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSubjects = async () => {
    if (!selectedClass || !selectedSection) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }
    try {
      console.log('[RESULTS] Fetching subjects for class:', selectedClass, 'section:', selectedSection);
      
      // Fetch from class-subjects/classes endpoint
      const response = await api.get('/class-subjects/classes', {
        headers: {
          'x-school-code': schoolCode.toUpperCase()
        }
      });
      
      if (response.data?.success && response.data?.data?.classes) {
        // Find the matching class and section
        const classData = response.data.data.classes.find(
          (c: any) => c.className === selectedClass && c.section === selectedSection
        );
        
        if (classData && classData.subjects) {
          // Filter active subjects only
          const activeSubjects = classData.subjects.filter((s: any) => s.isActive !== false);
          const subjectsList = activeSubjects.map((s: any) => ({
            subjectName: s.name,
            subjectCode: s.code || s.name
          }));
          
          setSubjects(subjectsList);
          console.log('[RESULTS] Loaded', subjectsList.length, 'subjects:', subjectsList);
        } else {
          console.log('[RESULTS] No subjects found for', selectedClass, selectedSection);
          setSubjects([]);
        }
      } else {
        console.log('[RESULTS] Invalid response from class-subjects API');
        setSubjects([]);
      }
    } catch (error) {
      console.error('[RESULTS] Error fetching subjects:', error);
      setSubjects([]);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass || !selectedSection) return;
    try {
      console.log('[RESULTS] Fetching students for', selectedClass, selectedSection);
      const studentsData = await getStudentsByClassSection(selectedClass, selectedSection);
      setStudents(studentsData);
      console.log('[RESULTS] Loaded', studentsData.length, 'students');
    } catch (error) {
      console.error('[RESULTS] Error fetching students:', error);
    }
  };

  const fetchExistingResults = async () => {
    if (!selectedClass || !selectedSection || !selectedSubject || !selectedTestType || !schoolCode) {
      setExistingResults([]);
      setStudentMarks({});
      return;
    }
    
    try {
      console.log('[RESULTS] Fetching existing results...');
      const response = await api.get('/results/teacher/view', {
        params: {
          schoolCode,
          class: selectedClass,
          section: selectedSection,
          subject: selectedSubject,
          testType: selectedTestType
        }
      });
      
      if (response.data?.success && response.data?.data?.results) {
        const results = response.data.data.results;
        setExistingResults(results);
        
        // Pre-fill marks for existing results
        const marks: {[key: string]: string} = {};
        results.forEach((result: any) => {
          if (result.obtainedMarks !== null && result.obtainedMarks !== undefined) {
            marks[result.studentId || result.userId] = result.obtainedMarks.toString();
          }
        });
        setStudentMarks(marks);
        
        console.log('[RESULTS] Loaded', results.length, 'existing results');
        
        // Check if any are frozen
        const frozenCount = results.filter((r: any) => r.frozen).length;
        if (frozenCount > 0) {
          Alert.alert('Info', `${frozenCount} result(s) are frozen and cannot be modified`);
        }
      }
    } catch (error: any) {
      console.error('[RESULTS] Error fetching existing results:', error);
      setExistingResults([]);
      setStudentMarks({});
    }
  };

  const handleSaveResults = async () => {
    if (!selectedClass || !selectedSection || !selectedSubject || !selectedTestType) {
      Alert.alert('Error', 'Please select class, section, subject, and test type');
      return;
    }

    const resultsToSave = students.map(student => ({
      studentId: student.userId,
      userId: student.userId,
      studentName: student.name?.displayName || `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
      obtainedMarks: studentMarks[student.userId] ? parseInt(studentMarks[student.userId]) : null,
      totalMarks: parseInt(maxMarks)
    }));

    const validResults = resultsToSave.filter(r => r.obtainedMarks !== null);
    
    if (validResults.length === 0) {
      Alert.alert('Error', 'Please enter marks for at least one student');
      return;
    }

    try {
      setSaving(true);
      console.log('[RESULTS] Saving results:', {
        class: selectedClass,
        section: selectedSection,
        subject: selectedSubject,
        testType: selectedTestType,
        count: validResults.length
      });

      const response = await api.post('/results/save', {
        schoolCode,
        class: selectedClass,
        section: selectedSection,
        subject: selectedSubject,
        testType: selectedTestType,
        maxMarks: parseInt(maxMarks),
        academicYear: '2024-25',
        results: resultsToSave
      });

      if (response.data?.success) {
        Alert.alert(
          'Success', 
          `Saved ${response.data.data.savedCount} results successfully!`,
          [{ text: 'OK', onPress: () => fetchExistingResults() }]
        );
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to save results');
      }
    } catch (error: any) {
      console.error('[RESULTS] Error saving results:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    checkRole();
  }, []);

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    if (isTeacher && selectedClass && selectedSection) {
      fetchSubjects();
    }
  }, [selectedClass, selectedSection]);

  useEffect(() => {
    if (isTeacher && selectedClass && selectedSection) {
      fetchStudents();
    }
  }, [selectedClass, selectedSection]);

  useEffect(() => {
    if (isTeacher && selectedClass && selectedSection && selectedSubject && selectedTestType) {
      fetchExistingResults();
    }
  }, [selectedClass, selectedSection, selectedSubject, selectedTestType]);

  const onRefresh = () => {
    setRefreshing(true);
    if (isTeacher) {
      fetchExistingResults();
    } else {
      fetchResults();
    }
  };

  const getAvailableSections = () => {
    const classItem = classes.find(c => c.className === selectedClass);
    return classItem?.sections?.map((s: any) => s.sectionName) || [];
  };

  const isResultFrozen = (studentId: string) => {
    const existing = existingResults.find(r => (r.studentId || r.userId) === studentId);
    return existing?.frozen || false;
  };

  const getIconForExamType = (examType: string) => {
    if (examType.toLowerCase().includes('formative') || examType.toLowerCase().includes('fa')) {
      return { icon: '✏️', bg: '#D1FAE5', color: '#10B981' };
    } else if (examType.toLowerCase().includes('mid') || examType.toLowerCase().includes('term')) {
      return { icon: '📝', bg: '#FEF3C7', color: '#F59E0B' };
    } else {
      return { icon: '📄', bg: '#FECACA', color: '#EF4444' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // TEACHER VIEW
  if (isTeacher) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Enter Results</Text>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="filter" size={20} color={isDark ? '#93C5FD' : '#1E3A8A'} />
              <Text style={styles.filterButtonText}>Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Filters Section */}
          {showFilters && (
            <View style={styles.filtersCard}>
              {/* Class Dropdown */}
              <View style={styles.dropdownRow}>
                <Text style={styles.filterLabel}>Class</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowClassModal(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {selectedClass || 'Select Class'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </View>

              {/* Section Dropdown */}
              <View style={styles.dropdownRow}>
                <Text style={styles.filterLabel}>Section</Text>
                <TouchableOpacity 
                  style={[styles.dropdownButton, !selectedClass && styles.dropdownButtonDisabled]}
                  onPress={() => selectedClass && setShowSectionModal(true)}
                  disabled={!selectedClass}
                >
                  <Text style={[styles.dropdownButtonText, !selectedClass && styles.dropdownButtonTextDisabled]}>
                    {selectedSection || 'Select Section'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </View>

              {/* Subject Dropdown */}
              <View style={styles.dropdownRow}>
                <Text style={styles.filterLabel}>Subject</Text>
                <TouchableOpacity 
                  style={[styles.dropdownButton, !selectedSection && styles.dropdownButtonDisabled]}
                  onPress={() => selectedSection && setShowSubjectModal(true)}
                  disabled={!selectedSection}
                >
                  <Text style={[styles.dropdownButtonText, !selectedSection && styles.dropdownButtonTextDisabled]}>
                    {selectedSubject || 'Select Subject'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </View>

              {/* Test Type Dropdown */}
              <View style={styles.dropdownRow}>
                <Text style={styles.filterLabel}>Test Type</Text>
                <TouchableOpacity 
                  style={[styles.dropdownButton, !selectedSubject && styles.dropdownButtonDisabled]}
                  onPress={() => selectedSubject && setShowTestTypeModal(true)}
                  disabled={!selectedSubject}
                >
                  <Text style={[styles.dropdownButtonText, !selectedSubject && styles.dropdownButtonTextDisabled]}>
                    {selectedTestType || 'Select Test Type'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </View>

              {/* Max Marks Input */}
              {selectedTestType && (
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Max Marks:</Text>
                  <TextInput
                    style={styles.maxMarksInput}
                    value={maxMarks}
                    onChangeText={setMaxMarks}
                    keyboardType="numeric"
                    placeholder="100"
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  />
                </View>
              )}
            </View>
          )}

          {/* Student List with Marks Entry */}
          {selectedClass && selectedSection && selectedSubject && selectedTestType && students.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedClass}-{selectedSection} | {selectedSubject} | {selectedTestType}
                </Text>
                <Text style={styles.studentCount}>{students.length} students</Text>
              </View>

              <View style={styles.marksCard}>
                <View style={styles.marksHeader}>
                  <Text style={styles.marksHeaderText}>Student Name</Text>
                  <Text style={styles.marksHeaderText}>Marks</Text>
                </View>

                {students.map((student) => {
                  const frozen = isResultFrozen(student.userId);
                  return (
                    <View key={student.userId} style={styles.studentMarksRow}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentNameText}>
                          {student.name?.displayName || `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim()}
                        </Text>
                        {frozen && (
                          <View style={styles.frozenBadge}>
                            <Ionicons name="lock-closed" size={12} color="#EF4444" />
                            <Text style={styles.frozenText}>Frozen</Text>
                          </View>
                        )}
                      </View>
                      <TextInput
                        style={[styles.marksInput, frozen && styles.marksInputDisabled]}
                        value={studentMarks[student.userId] || ''}
                        onChangeText={(text) => {
                          if (!frozen) {
                            setStudentMarks(prev => ({
                              ...prev,
                              [student.userId]: text
                            }));
                          }
                        }}
                        keyboardType="numeric"
                        placeholder={`/${maxMarks}`}
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        editable={!frozen}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveResults}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Results</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Empty State */}
          {(!selectedClass || !selectedSection || !selectedSubject || !selectedTestType) && (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={isDark ? '#4B5563' : '#9CA3AF'} />
              <Text style={styles.emptyStateText}>Select filters to enter results</Text>
              <Text style={styles.emptyStateSubtext}>
                Choose class, section, subject, and test type to begin
              </Text>
            </View>
          )}

          {selectedClass && selectedSection && selectedSubject && selectedTestType && students.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={isDark ? '#4B5563' : '#9CA3AF'} />
              <Text style={styles.emptyStateText}>No students found</Text>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Class Selection Modal */}
        <Modal visible={showClassModal} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowClassModal(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Class</Text>
                <TouchableOpacity onPress={() => setShowClassModal(false)}>
                  <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#1F2937'} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {classes.map((cls) => (
                  <TouchableOpacity
                    key={cls.className}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedClass(cls.className);
                      setSelectedSection('');
                      setSelectedSubject('');
                      setSelectedTestType('');
                      setShowClassModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, selectedClass === cls.className && styles.modalItemTextActive]}>
                      {cls.className}
                    </Text>
                    {selectedClass === cls.className && (
                      <Ionicons name="checkmark" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Section Selection Modal */}
        <Modal visible={showSectionModal} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSectionModal(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Section</Text>
                <TouchableOpacity onPress={() => setShowSectionModal(false)}>
                  <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#1F2937'} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {getAvailableSections().map((sec: string) => (
                  <TouchableOpacity
                    key={sec}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedSection(sec);
                      setSelectedSubject('');
                      setSelectedTestType('');
                      setShowSectionModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, selectedSection === sec && styles.modalItemTextActive]}>
                      {sec}
                    </Text>
                    {selectedSection === sec && (
                      <Ionicons name="checkmark" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Subject Selection Modal */}
        <Modal visible={showSubjectModal} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSubjectModal(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Subject</Text>
                <TouchableOpacity onPress={() => setShowSubjectModal(false)}>
                  <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#1F2937'} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {subjects.map((subj) => (
                  <TouchableOpacity
                    key={subj.subjectCode || subj.subjectName}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedSubject(subj.subjectName);
                      setSelectedTestType('');
                      setShowSubjectModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, selectedSubject === subj.subjectName && styles.modalItemTextActive]}>
                      {subj.subjectName}
                    </Text>
                    {selectedSubject === subj.subjectName && (
                      <Ionicons name="checkmark" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Test Type Selection Modal */}
        <Modal visible={showTestTypeModal} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTestTypeModal(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Test Type</Text>
                <TouchableOpacity onPress={() => setShowTestTypeModal(false)}>
                  <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#1F2937'} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {testTypes.map((test) => (
                  <TouchableOpacity
                    key={test}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedTestType(test);
                      setShowTestTypeModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, selectedTestType === test && styles.modalItemTextActive]}>
                      {test}
                    </Text>
                    {selectedTestType === test && (
                      <Ionicons name="checkmark" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  // STUDENT VIEW (Original)
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Results</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {results.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No results available yet</Text>
            </View>
          ) : (
            results.map((result) => {
              const iconData = getIconForExamType(result.examType);
              const isExpanded = expandedResult === result._id;
              return (
                <View key={result._id} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <View style={styles.resultLeft}>
                      <View style={[styles.iconContainer, { backgroundColor: iconData.bg }]}>
                        <Text style={styles.iconText}>{iconData.icon}</Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle}>{result.examType}</Text>
                        <Text style={styles.resultDate}>
                          {result.overallPercentage.toFixed(1)}% | {result.overallGrade || 'N/A'}
                        </Text>
                        <Text style={styles.resultSubjects}>
                          {result.subjects.length} subjects
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.viewDetailsButton}
                      onPress={() => setExpandedResult(isExpanded ? null : result._id)}
                    >
                      <Text style={styles.viewDetailsText}>
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {isExpanded && (
                    <View style={styles.subjectDetails}>
                      <Text style={styles.subjectDetailsTitle}>Subject-wise Marks</Text>
                      {result.subjects.map((subject, index) => (
                        <View key={index} style={styles.subjectRow}>
                          <View style={styles.subjectInfo}>
                            <Text style={styles.subjectName}>{subject.subjectName}</Text>
                            <Text style={styles.subjectMarks}>
                              {subject.marksObtained}/{subject.totalMarks}
                            </Text>
                          </View>
                          <View style={styles.subjectGrade}>
                            <Text style={styles.subjectPercentage}>
                              {subject.percentage.toFixed(1)}%
                            </Text>
                            {subject.grade && (
                              <Text style={styles.subjectGradeText}>{subject.grade}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                      {result.rank && (
                        <View style={styles.rankContainer}>
                          <Text style={styles.rankText}>Class Rank: {result.rank}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
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
    header: { padding: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A' },
    filterButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1F2937' : '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
    filterButtonText: { fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A' },
    filtersCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    filterRow: { marginBottom: 16 },
    filterLabel: { fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 8 },
    filterOptions: { flexDirection: 'row' },
    filterChip: { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
    filterChipActive: { backgroundColor: isDark ? '#1E40AF' : '#DBEAFE', borderColor: '#60A5FA' },
    filterChipText: { fontSize: 14, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' },
    filterChipTextActive: { color: isDark ? '#93C5FD' : '#1E3A8A' },
    maxMarksInput: { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, fontSize: 16, color: isDark ? '#E5E7EB' : '#1F2937', borderWidth: 2, borderColor: isDark ? '#374151' : '#E5E7EB', width: 100 },
    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A' },
    studentCount: { fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280' },
    marksCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    marksHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB', marginBottom: 12 },
    marksHeaderText: { fontSize: 14, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A' },
    studentMarksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#F3F4F6' },
    studentInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    studentNameText: { fontSize: 14, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1F2937', flex: 1 },
    frozenBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    frozenText: { fontSize: 10, fontWeight: '600', color: '#EF4444' },
    marksInput: { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 16, color: isDark ? '#E5E7EB' : '#1F2937', width: 80, textAlign: 'center', borderWidth: 2, borderColor: isDark ? '#374151' : '#E5E7EB' },
    marksInputDisabled: { backgroundColor: isDark ? '#111827' : '#E5E7EB', opacity: 0.6 },
    saveButton: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 16, gap: 8 },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyStateText: { fontSize: 18, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 16, textAlign: 'center' },
    emptyStateSubtext: { fontSize: 14, color: isDark ? '#6B7280' : '#9CA3AF', marginTop: 8, textAlign: 'center' },
    // Student view styles
    resultCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    iconText: { fontSize: 24 },
    resultInfo: { flex: 1 },
    resultTitle: { fontSize: 16, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937', marginBottom: 4 },
    resultDate: { fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 2 },
    resultSubjects: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' },
    viewDetailsButton: { backgroundColor: '#60A5FA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    viewDetailsText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
    noDataContainer: { alignItems: 'center', marginTop: 40, paddingVertical: 40 },
    noDataText: { fontSize: 16, color: isDark ? '#93C5FD' : '#1E3A8A', fontWeight: '600' },
    subjectDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? '#1F2937' : '#E5E7EB' },
    subjectDetailsTitle: { fontSize: 14, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 12 },
    subjectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#F3F4F6' },
    subjectInfo: { flex: 1 },
    subjectName: { fontSize: 14, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1F2937', marginBottom: 2 },
    subjectMarks: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' },
    subjectGrade: { alignItems: 'flex-end' },
    subjectPercentage: { fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A' },
    subjectGradeText: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 },
    rankContainer: { marginTop: 12, padding: 12, backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderRadius: 8 },
    rankText: { fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A', textAlign: 'center' },
    // Dropdown styles
    dropdownRow: { marginBottom: 16 },
    dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDark ? '#1F2937' : '#F3F4F6', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 2, borderColor: isDark ? '#374151' : '#E5E7EB' },
    dropdownButtonDisabled: { opacity: 0.5 },
    dropdownButtonText: { fontSize: 16, fontWeight: '500', color: isDark ? '#E5E7EB' : '#1F2937' },
    dropdownButtonTextDisabled: { color: isDark ? '#6B7280' : '#9CA3AF' },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937' },
    modalList: { maxHeight: 400 },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#F3F4F6' },
    modalItemText: { fontSize: 16, fontWeight: '500', color: isDark ? '#E5E7EB' : '#1F2937' },
    modalItemTextActive: { color: '#10B981', fontWeight: '700' },
  });
}
