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
  dueDate: string;
  startDate: string;
  class: string;
  section: string;
  totalSubmissions?: number;
  pendingSubmissions?: number;
  gradedSubmissions?: number;
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
 * Get students by class and section
 */
export async function getStudentsByClassSection(className: string, section?: string): Promise<Student[]> {
  try {
    const params: any = { className };
    if (section && section !== 'ALL') {
      params.section = section;
    }

    const response = await api.get('/reports/students-by-class-section', { params });
    
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    
    // Fallback: use users endpoint
    const schoolCode = await AsyncStorage.getItem('schoolCode');
    if (!schoolCode) throw new Error('No school code found');

    const userResponse = await api.get(`/users/role/student`, {
      params: { className, section }
    });

    if (userResponse.data?.success && userResponse.data?.data) {
      return userResponse.data.data;
    }

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

