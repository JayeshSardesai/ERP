import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Class {
  classId: string;
  className: string;
  sections: Section[];
}

export interface Section {
  sectionId: string;
  sectionName: string;
}

export interface Student {
  _id: string;
  userId: string;
  name: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    displayName?: string;
  };
  email?: string;
  studentDetails?: {
    admissionNumber?: string;
    currentClass?: string;
    currentSection?: string;
    academicYear?: string;
  };
  academicInfo?: {
    class?: string;
    section?: string;
  };
  attendance?: {
    presentDays?: number;
    absentDays?: number;
    attendancePercentage?: number;
  };
  averageMarks?: number;
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  description?: string;
  instructions?: string;
  dueDate: string;
  startDate: string;
  class: string;
  section: string;
  status?: 'pending' | 'submitted' | 'graded' | 'published' | 'draft';
  totalSubmissions?: number;
  pendingSubmissions?: number;
  gradedSubmissions?: number;
  attachments?: Array<{
    path: string;
    originalName: string;
    size?: number;
  }>;
}

export interface Message {
  _id: string;
  id?: string;
  title?: string;
  subject: string;
  message: string;
  sender?: string;
  senderRole?: string;
  class?: string;
  section?: string;
  createdAt: string;
  isRead?: boolean;
}

export interface TeacherProfile {
  _id: string;
  userId: string;
  name: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    displayName?: string;
  };
  email: string;
  schoolCode: string;
  profileImage?: string;
  contact?: {
    primaryPhone?: string;
    secondaryPhone?: string;
  };
  teacherDetails?: {
    employeeId?: string;
    subjects?: Array<{
      subjectName: string;
      classes: string[];
    }>;
    classTeacherOf?: string;
  };
  isActive?: boolean;
  lastLogin?: string;
}

export interface AttendanceRecord {
  _id: string;
  date: string;
  dateString: string;
  status: 'present' | 'absent' | 'no-class';
  sessions: {
    morning: { status: 'present' | 'absent' } | null;
    afternoon: { status: 'present' | 'absent' } | null;
  };
  studentId: string;
  class: string;
  section: string;
}

export interface ClassAttendance {
  date: string;
  session: 'morning' | 'afternoon';
  class: string;
  section: string;
  students: Array<{
    studentId: string;
    name: string;
    status: 'present' | 'absent';
  }>;
}

export interface StudentResult {
  _id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  subject: string;
  testName: string;
  marks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  date: string;
}

export interface CreateAssignmentData {
  title: string;
  subject: string;
  description?: string;
  instructions?: string;
  dueDate: string;
  startDate: string;
  class: string;
  section: string;
  attachments?: File[];
}

/**
 * Get all classes and sections for the school
 */
export async function getClasses(): Promise<Class[]> {
  try {
    const schoolCode = await AsyncStorage.getItem('schoolCode');
    if (!schoolCode) throw new Error('No school code found');

    const response = await api.get(`/schools/${schoolCode}/classes`);
    
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    
    return [];
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching classes:', error);
    return [];
  }
}

/**
 * Get students by class and section - Optimized
 */
export async function getStudentsByClassSection(className: string, section?: string): Promise<Student[]> {
  try {
    console.log('[TEACHER SERVICE] Fetching students for class:', className, 'section:', section);
    
    const params: any = { className };
    if (section && section !== 'ALL') {
      params.section = section;
    }

    // Use the correct route path
    const response = await api.get('/reports/students-by-class', { params });
    
    console.log('[TEACHER SERVICE] Students API response:', response.data);
    
    if (response.data?.success && response.data?.data) {
      console.log('[TEACHER SERVICE] Found', response.data.data.length, 'students');
      return response.data.data;
    }
    
    // If no data, return empty array instead of making another API call
    console.log('[TEACHER SERVICE] No students found for class:', className, 'section:', section);
    return [];
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching students:', error);
    return [];
  }
}

/**
 * Get teacher's assignments (assignments created by teacher)
 */
export async function getTeacherAssignments(): Promise<Assignment[]> {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) throw new Error('No user data found');
    
    const user = JSON.parse(userData);
    const response = await api.get('/assignments', {
      params: {
        teacherId: user.userId || user._id,
      }
    });
    
    return response.data.assignments || response.data.data || [];
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching assignments:', error);
    return [];
  }
}

/**
 * Get messages for teacher
 */
export async function getTeacherMessages(): Promise<Message[]> {
  try {
    const response = await api.get('/messages');
    
    const messages = response.data?.data?.messages || response.data?.messages || response.data?.data || [];
    
    return messages.map((msg: any) => ({
      _id: msg.id || msg._id,
      id: msg.id || msg._id,
      title: msg.title || msg.subject,
      subject: msg.subject || msg.title || 'No Subject',
      message: msg.message || '',
      sender: msg.sender || 'School Admin',
      senderRole: msg.senderRole || 'admin',
      class: msg.class,
      section: msg.section,
      createdAt: msg.createdAt,
      isRead: msg.isRead || false,
    }));
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching messages:', error);
    return [];
  }
}

/**
 * Get teacher profile
 */
export async function getTeacherProfile(): Promise<TeacherProfile | null> {
  try {
    const response = await api.get('/users/my-profile');
    
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    
    return response.data || null;
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching teacher profile:', error);
    return null;
  }
}

/**
 * Get subjects assigned to teacher
 */
export async function getTeacherSubjects(): Promise<any[]> {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) throw new Error('No user data found');
    
    const user = JSON.parse(userData);
    const response = await api.get(`/subjects/teacher/${user._id || user.userId}`);
    
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    
    return response.data || [];
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching subjects:', error);
    return [];
  }
}

/**
 * Get class attendance for teacher
 */
export async function getClassAttendance(className: string, section: string, date?: string): Promise<AttendanceRecord[]> {
  try {
    const params: any = { className, section };
    if (date) {
      params.date = date;
    }

    const response = await api.get('/attendance', { params });
    
    if (response.data?.success && response.data?.data?.records) {
      return response.data.data.records;
    }
    
    return response.data?.records || response.data?.data || [];
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching class attendance:', error);
    return [];
  }
}

/**
 * Mark session attendance for a class
 */
export async function markSessionAttendance(attendanceData: ClassAttendance): Promise<boolean> {
  try {
    const response = await api.post('/attendance/mark-session', attendanceData);
    return response.data?.success || false;
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error marking attendance:', error);
    return false;
  }
}

/**
 * Get results for teacher's classes
 */
export async function getTeacherResults(className?: string, section?: string, subject?: string): Promise<StudentResult[]> {
  try {
    const params: any = {};
    if (className) params.className = className;
    if (section) params.section = section;
    if (subject) params.subject = subject;

    const response = await api.get('/results/teacher/view', { params });
    
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    
    return response.data?.results || response.data?.data || [];
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching results:', error);
    return [];
  }
}

/**
 * Save/update student results
 */
export async function saveStudentResults(results: Partial<StudentResult>[]): Promise<boolean> {
  try {
    const response = await api.post('/results/save', { results });
    return response.data?.success || false;
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error saving results:', error);
    return false;
  }
}

/**
 * Create new assignment
 */
export async function createAssignment(assignmentData: CreateAssignmentData): Promise<boolean> {
  try {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(assignmentData).forEach(key => {
      if (key !== 'attachments' && assignmentData[key as keyof CreateAssignmentData]) {
        formData.append(key, assignmentData[key as keyof CreateAssignmentData] as string);
      }
    });

    // Add attachments if any
    if (assignmentData.attachments && assignmentData.attachments.length > 0) {
      assignmentData.attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });
    }

    const response = await api.post('/assignments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data?.success || false;
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error creating assignment:', error);
    return false;
  }
}

/**
 * Update assignment
 */
export async function updateAssignment(assignmentId: string, assignmentData: Partial<CreateAssignmentData>): Promise<boolean> {
  try {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(assignmentData).forEach(key => {
      if (key !== 'attachments' && assignmentData[key as keyof CreateAssignmentData]) {
        formData.append(key, assignmentData[key as keyof CreateAssignmentData] as string);
      }
    });

    // Add attachments if any
    if (assignmentData.attachments && assignmentData.attachments.length > 0) {
      assignmentData.attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });
    }

    const response = await api.put(`/assignments/${assignmentId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data?.success || false;
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error updating assignment:', error);
    return false;
  }
}

/**
 * Delete assignment
 */
export async function deleteAssignment(assignmentId: string): Promise<boolean> {
  try {
    const response = await api.delete(`/assignments/${assignmentId}`);
    return response.data?.success || false;
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error deleting assignment:', error);
    return false;
  }
}

/**
 * Get assignment submissions for teacher
 */
export async function getAssignmentSubmissions(assignmentId: string): Promise<any[]> {
  try {
    const response = await api.get(`/assignments/${assignmentId}/submissions`);
    
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    
    return response.data?.submissions || response.data?.data || [];
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching submissions:', error);
    return [];
  }
}

/**
 * Grade assignment submission
 */
export async function gradeSubmission(submissionId: string, grade: number, feedback?: string): Promise<boolean> {
  try {
    const response = await api.put(`/assignments/submissions/${submissionId}/grade`, {
      grade,
      feedback
    });
    
    return response.data?.success || false;
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error grading submission:', error);
    return false;
  }
}

