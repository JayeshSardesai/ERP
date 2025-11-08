import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getClasses, getTeacherSubjects, createAssignment } from '@/src/services/teacher';

interface CreateAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Class {
  className: string;
  sections: Array<{ sectionName: string }>;
}

interface Subject {
  subjectName: string;
  classes: string[];
}

export default function CreateAssignmentModal({ visible, onClose, onSuccess }: CreateAssignmentModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [term, setTerm] = useState('1');

  // UI state
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchInitialData();
    }
  }, [visible]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [classData, subjectData] = await Promise.all([
        getClasses(),
        getTeacherSubjects()
      ]);
      
      setClasses(classData);
      setSubjects(subjectData);
      
      // Set defaults if available
      if (classData.length > 0) {
        setSelectedClass(classData[0].className);
        if (classData[0].sections.length > 0) {
          setSelectedSection(classData[0].sections[0].sectionName);
        }
      }
      
      if (subjectData.length > 0) {
        setSubject(subjectData[0].subjectName);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load classes and subjects');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstructions('');
    setSubject('');
    setSelectedClass('');
    setSelectedSection('');
    setStartDate(new Date());
    setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setAcademicYear('2024-25');
    setTerm('1');
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter assignment title');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }
    if (!selectedClass.trim()) {
      Alert.alert('Error', 'Please select a class');
      return;
    }
    if (!selectedSection.trim()) {
      Alert.alert('Error', 'Please select a section');
      return;
    }
    if (dueDate <= startDate) {
      Alert.alert('Error', 'Due date must be after start date');
      return;
    }

    try {
      setLoading(true);
      
      const assignmentData = {
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        subject: subject.trim(),
        class: selectedClass,
        section: selectedSection,
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
        academicYear,
        term
      };

      const success = await createAssignment(assignmentData);
      
      if (success) {
        Alert.alert('Success', 'Assignment created successfully', [
          { text: 'OK', onPress: () => {
            resetForm();
            onSuccess();
            onClose();
          }}
        ]);
      } else {
        Alert.alert('Error', 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      Alert.alert('Error', 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSectionsForClass = () => {
    const classData = classes.find(c => c.className === selectedClass);
    return classData?.sections || [];
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Assignment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter assignment title"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </View>

            {/* Subject */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject *</Text>
              <TouchableOpacity 
                style={styles.picker}
                onPress={() => setShowSubjectPicker(true)}
              >
                <Text style={[styles.pickerText, !subject && styles.placeholderText]}>
                  {subject || 'Select Subject'}
                </Text>
                <Text style={styles.pickerIcon}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Class and Section */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Class *</Text>
                <TouchableOpacity 
                  style={styles.picker}
                  onPress={() => setShowClassPicker(true)}
                >
                  <Text style={[styles.pickerText, !selectedClass && styles.placeholderText]}>
                    {selectedClass || 'Select Class'}
                  </Text>
                  <Text style={styles.pickerIcon}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Section *</Text>
                <TouchableOpacity 
                  style={styles.picker}
                  onPress={() => setShowSectionPicker(true)}
                >
                  <Text style={[styles.pickerText, !selectedSection && styles.placeholderText]}>
                    {selectedSection || 'Select Section'}
                  </Text>
                  <Text style={styles.pickerIcon}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Academic Year and Term */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Academic Year</Text>
                <TextInput
                  style={styles.textInput}
                  value={academicYear}
                  onChangeText={setAcademicYear}
                  placeholder="2024-25"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Term</Text>
                <TextInput
                  style={styles.textInput}
                  value={term}
                  onChangeText={setTerm}
                  placeholder="1"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Start Date and Due Date */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Start Date *</Text>
                <TouchableOpacity 
                  style={styles.picker}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                  <Text style={styles.pickerIcon}>📅</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Due Date *</Text>
                <TouchableOpacity 
                  style={styles.picker}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Text style={styles.pickerText}>{formatDate(dueDate)}</Text>
                  <Text style={styles.pickerIcon}>📅</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter assignment description"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Instructions */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Enter detailed instructions for students"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Assignment</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
              }
            }}
          />
        )}

        {showDueDatePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDueDatePicker(false);
              if (selectedDate) {
                setDueDate(selectedDate);
              }
            }}
          />
        )}

        {/* Web Date Picker Fallback */}
        {showStartDatePicker && Platform.OS === 'web' && (
          <Modal visible={true} transparent={true} animationType="fade">
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModal}>
                <Text style={styles.pickerModalTitle}>Select Start Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={startDate.toISOString().split('T')[0]}
                  onChangeText={(text) => {
                    const newDate = new Date(text);
                    if (!isNaN(newDate.getTime())) {
                      setStartDate(newDate);
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                />
                <TouchableOpacity
                  style={styles.pickerCloseButton}
                  onPress={() => setShowStartDatePicker(false)}
                >
                  <Text style={styles.pickerCloseButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {showDueDatePicker && Platform.OS === 'web' && (
          <Modal visible={true} transparent={true} animationType="fade">
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModal}>
                <Text style={styles.pickerModalTitle}>Select Due Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={dueDate.toISOString().split('T')[0]}
                  onChangeText={(text) => {
                    const newDate = new Date(text);
                    if (!isNaN(newDate.getTime())) {
                      setDueDate(newDate);
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                />
                <TouchableOpacity
                  style={styles.pickerCloseButton}
                  onPress={() => setShowDueDatePicker(false)}
                >
                  <Text style={styles.pickerCloseButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Subject Picker Modal */}
        <Modal visible={showSubjectPicker} transparent={true} animationType="fade">
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModal}>
              <Text style={styles.pickerModalTitle}>Select Subject</Text>
              <ScrollView style={styles.pickerList}>
                {subjects.map((subj, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSubject(subj.subjectName);
                      setShowSubjectPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{subj.subjectName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowSubjectPicker(false)}
              >
                <Text style={styles.pickerCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Class Picker Modal */}
        <Modal visible={showClassPicker} transparent={true} animationType="fade">
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModal}>
              <Text style={styles.pickerModalTitle}>Select Class</Text>
              <ScrollView style={styles.pickerList}>
                {classes.map((cls, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedClass(cls.className);
                      setSelectedSection(''); // Reset section when class changes
                      setShowClassPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{cls.className}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowClassPicker(false)}
              >
                <Text style={styles.pickerCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Section Picker Modal */}
        <Modal visible={showSectionPicker} transparent={true} animationType="fade">
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModal}>
              <Text style={styles.pickerModalTitle}>Select Section</Text>
              <ScrollView style={styles.pickerList}>
                {getSectionsForClass().map((section, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedSection(section.sectionName);
                      setShowSectionPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{section.sectionName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowSectionPicker(false)}
              >
                <Text style={styles.pickerCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end'
    },
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
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#E5E7EB' : '#1F2937'
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center'
    },
    closeButtonText: {
      fontSize: 18,
      color: isDark ? '#E5E7EB' : '#1F2937',
      fontWeight: '600'
    },
    modalBody: {
      flex: 1,
      padding: 20
    },
    inputGroup: {
      marginBottom: 20
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 8,
      textTransform: 'uppercase'
    },
    textInput: {
      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#D1D5DB',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: isDark ? '#E5E7EB' : '#1F2937'
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top'
    },
    picker: {
      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#D1D5DB',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    pickerText: {
      fontSize: 16,
      color: isDark ? '#E5E7EB' : '#1F2937'
    },
    placeholderText: {
      color: isDark ? '#9CA3AF' : '#6B7280'
    },
    pickerIcon: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280'
    },
    row: {
      flexDirection: 'row',
      gap: 12
    },
    halfWidth: {
      flex: 1
    },
    submitButton: {
      backgroundColor: isDark ? '#1E40AF' : '#3B82F6',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20
    },
    submitButtonDisabled: {
      opacity: 0.6
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600'
    },
    pickerModalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    pickerModal: {
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      maxHeight: '60%',
      width: '80%'
    },
    pickerModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#1F2937',
      marginBottom: 16,
      textAlign: 'center'
    },
    pickerList: {
      maxHeight: 200
    },
    pickerItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB'
    },
    pickerItemText: {
      fontSize: 16,
      color: isDark ? '#E5E7EB' : '#1F2937'
    },
    pickerCloseButton: {
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      marginTop: 16
    },
    pickerCloseButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#1F2937'
    }
  });
}
