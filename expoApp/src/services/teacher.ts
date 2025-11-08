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
  maxMarks?: number;
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
 * Get class subjects for a specific class
 */
export async function getClassSubjects(className: string): Promise<any[]> {
  try {
    console.log('[TEACHER SERVICE] Fetching class subjects for:', className);
    const response = await api.get(`/class-subjects/class/${className}`);
    
    console.log('[TEACHER SERVICE] Class subjects response:', response.data);
    
    if (response.data?.success && response.data?.data?.subjects) {
      return response.data.data.subjects.filter((subject: any) => subject.isActive !== false);
    }
    
    return response.data?.subjects || [];
  } catch (error: any) {
    console.error('[TEACHER SERVICE] Error fetching class subjects:', error);
    return [];
  }
}

/**
 * Get subjects assigned to teacher, with fallback to class subjects
 */
export async function getTeacherSubjects(): Promise<any[]> {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) throw new Error('No user data found');
    
    const user = JSON.parse(userData);
    const teacherId = user._id || user.userId;
    
    console.log('[TEACHER SERVICE] Fetching subjects for teacher:', teacherId);
    
    // First try to get teacher-specific subjects
    try {
      const response = await api.get(`/subjects/teacher/${teacherId}`);
      console.log('[TEACHER SERVICE] Teacher subjects response:', response.data);
      
      if (response.data?.success && response.data?.data && response.data.data.length > 0) {
        console.log('[TEACHER SERVICE] Found teacher-specific subjects:', response.data.data.length);
        return response.data.data;
      }
    } catch (teacherSubjectsError: any) {
      console.log('[TEACHER SERVICE] No teacher-specific subjects found, trying class subjects');
    }
    
    // If no teacher-specific subjects, try to get subjects from teacher's classes
    console.log('[TEACHER SERVICE] Attempting to fetch class subjects as fallback');
    
    // Get teacher's classes first
    const classesResponse = await getClasses();
    console.log('[TEACHER SERVICE] Teacher classes:', classesResponse);
    
    if (classesResponse && classesResponse.length > 0) {
      // Get subjects from the first class as fallback
      const firstClass = classesResponse[0];
      const className = firstClass.className;
      
      if (className) {
        console.log('[TEACHER SERVICE] Fetching subjects for class:', className);
        const classSubjects = await getClassSubjects(className);
        
        if (classSubjects && classSubjects.length > 0) {
          console.log('[TEACHER SERVICE] Found class subjects as fallback:', classSubjects.length);
          // Transform class subjects to match teacher subjects format
          return classSubjects.map((subject: any) => ({
            _id: subject._id || subject.name,
            name: subject.name || subject.subjectName,
            subjectName: subject.name || subject.subjectName,
            className: className,
            isClassSubject: true // Flag to indicate this is a class subject, not teacher-assigned
          }));
        }
      }
    }
    
    console.log('[TEACHER SERVICE] No subjects found - neither teacher-specific nor class subjects');
    return [];
    
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


