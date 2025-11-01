import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  description?: string;
  dueDate: string;
  startDate: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
  totalMarks?: number;
  instructions?: string;
  class: string;
  section: string;
}

export interface AttendanceRecord {
  _id: string;
  date: string;
  dateString?: string;
  dayOfWeek?: string;
  status: 'present' | 'absent' | 'half_day';
  sessions: {
    morning: {
      status: 'present' | 'absent';
      markedAt?: string;
    } | null;
    afternoon: {
      status: 'present' | 'absent';
      markedAt?: string;
    } | null;
  };
}

export interface Result {
  _id: string;
  examType: string;
  subjects: Array<{
    subjectName: string;
    marksObtained: number;
    totalMarks: number;
    grade?: string;
    percentage: number;
  }>;
  overallPercentage: number;
  overallGrade?: string;
  rank?: number;
  academicYear: string;
}

export interface Message {
  _id: string;
  id?: string;
  title?: string;
  subject: string;
  message: string;
  sender?: string;
  senderRole?: string;
  adminId?: string;
  class?: string;
  section?: string;
  createdAt: string;
  isRead?: boolean;
  messageAge?: string;
  urgencyIndicator?: string;
}

export async function getStudentAssignments(): Promise<Assignment[]> {
  try {
    console.log('[STUDENT SERVICE] Fetching assignments...');
    
    // Debug: Check if token exists
    const token = await AsyncStorage.getItem('authToken');
    const schoolCode = await AsyncStorage.getItem('schoolCode');
    console.log('[STUDENT SERVICE] Token exists:', !!token);
    console.log('[STUDENT SERVICE] School code:', schoolCode);
    
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) throw new Error('No user data found');
    
    const user = JSON.parse(userData);
    const response = await api.get('/assignments', {
      params: {
        studentId: user.userId || user._id,
      }
    });
    console.log('[STUDENT SERVICE] Assignments response:', response.data);
    
    // Backend returns { assignments, totalPages, currentPage, total }
    return response.data.assignments || response.data.data || [];
  } catch (error: any) {
    console.error('[STUDENT SERVICE] Error fetching assignments:', error);
    console.error('[STUDENT SERVICE] Error response:', error?.response?.data);
    console.error('[STUDENT SERVICE] Error status:', error?.response?.status);
    return [];
  }
}

export async function getStudentAttendance(startDate?: string, endDate?: string): Promise<{
  records: AttendanceRecord[];
  stats: { totalDays: number; presentDays: number; absentDays: number; lateDays: number; halfDays: number; leaveDays: number; attendancePercentage: number };
}> {
  try {
    console.log('[STUDENT SERVICE] Fetching attendance...');
    
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    // Use the new my-attendance endpoint which filters by student's class/section
    const response = await api.get('/attendance/my-attendance', { params });
    
    console.log('[STUDENT SERVICE] Attendance response:', response.data);
    
    if (response.data?.success && response.data?.data) {
      return {
        records: response.data.data.records || [],
        stats: response.data.data.summary || { 
          totalDays: 0, 
          presentDays: 0, 
          absentDays: 0, 
          lateDays: 0,
          halfDays: 0,
          leaveDays: 0,
          attendancePercentage: 0 
        }
      };
    }
    
    return {
      records: [],
      stats: { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, halfDays: 0, leaveDays: 0, attendancePercentage: 0 }
    };
  } catch (error: any) {
    console.error('[STUDENT SERVICE] Error fetching attendance:', error);
    console.error('[STUDENT SERVICE] Error response:', error?.response?.data);
    return {
      records: [],
      stats: { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, halfDays: 0, leaveDays: 0, attendancePercentage: 0 }
    };
  }
}

export async function getStudentResults(): Promise<Result[]> {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) throw new Error('No user data found');
    
    const user = JSON.parse(userData);
    const response = await api.get(`/results/student/${user.userId || user._id}/history`);
    
    return response.data.results || response.data.data || [];
  } catch (error) {
    console.error('Error fetching results:', error);
    return [];
  }
}

export async function getStudentMessages(): Promise<Message[]> {
  try {
    const response = await api.get('/messages');
    
    // Backend returns { success: true, data: { messages: [...], pagination: {...} } }
    const messages = response.data?.data?.messages || response.data?.messages || response.data?.data || [];
    
    // Map backend format to frontend format
    return messages.map((msg: any) => ({
      _id: msg.id || msg._id,
      id: msg.id || msg._id,
      title: msg.title || msg.subject,
      subject: msg.subject || msg.title || 'No Subject',
      message: msg.message || '',
      sender: msg.sender || 'School Admin',
      senderRole: msg.senderRole || 'admin',
      adminId: msg.adminId,
      class: msg.class,
      section: msg.section,
      createdAt: msg.createdAt,
      isRead: msg.isRead || false,
      messageAge: msg.messageAge,
      urgencyIndicator: msg.urgencyIndicator
    }));
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

export async function submitAssignment(assignmentId: string, attachments: any[]): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('assignmentId', assignmentId);
    
    attachments.forEach((attachment, index) => {
      formData.append('attachments', attachment);
    });
    
    const response = await api.post(`/assignments/${assignmentId}/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    return response.data.success || false;
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return false;
  }
}
