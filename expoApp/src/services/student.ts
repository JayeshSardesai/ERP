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
  status: 'present' | 'absent' | 'half_day' | 'no-class';
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
      // Handle different response structures
      let rawRecords = [];
      
      if (response.data.data.records && Array.isArray(response.data.data.records)) {
        rawRecords = response.data.data.records;
      } else if (Array.isArray(response.data.data)) {
        rawRecords = response.data.data;
      } else {
        console.warn('[STUDENT SERVICE] Unexpected data structure:', response.data.data);
        rawRecords = [];
      }
      
      console.log('[STUDENT SERVICE] Raw records count:', rawRecords.length);
      console.log('[STUDENT SERVICE] Sample raw record:', rawRecords[0]);
      
      // Transform session-based records to day-based records
      const dayRecordsMap = new Map<string, AttendanceRecord>();
      
      rawRecords.forEach((sessionRecord: any) => {
        // Handle different date formats
        let dateStr: string;
        if (sessionRecord.date) {
          dateStr = new Date(sessionRecord.date).toISOString().split('T')[0];
        } else if (sessionRecord.dateString) {
          dateStr = sessionRecord.dateString;
        } else {
          console.warn('[STUDENT SERVICE] No date found in record:', sessionRecord);
          return;
        }
        
        console.log(`[STUDENT SERVICE] Raw record for ${dateStr}:`, {
          _id: sessionRecord._id,
          date: sessionRecord.date,
          dateString: sessionRecord.dateString,
          status: sessionRecord.status,
          session: sessionRecord.session
        });
        
        // Determine session from the record
        let session: string | null = null;
        let sessionStatus: string = 'no-class';
        
        // Method 1: Check if session is directly in the record
        if (sessionRecord.session) {
          session = sessionRecord.session;
          sessionStatus = sessionRecord.status || 'no-class';
        }
        // Method 2: Extract from _id field if it follows the pattern
        else if (sessionRecord._id && typeof sessionRecord._id === 'string') {
          const idParts = sessionRecord._id.split('_');
          if (idParts.length >= 4) {
            session = idParts[3]; // 'morning' or 'afternoon'
            sessionStatus = sessionRecord.status || 'no-class';
          }
        }
        // Method 3: Check if there are students array with session info
        else if (sessionRecord.students && Array.isArray(sessionRecord.students)) {
          // This is a session document, extract student's attendance
          // Note: We'll get userData outside the loop to avoid async issues
          session = sessionRecord.session || 'unknown';
          sessionStatus = 'no-class'; // Default, will be updated if student found
        }
        
        console.log(`[STUDENT SERVICE] Processing ${dateStr} ${session}: ${sessionStatus}`);
        
        if (!dayRecordsMap.has(dateStr)) {
          dayRecordsMap.set(dateStr, {
            _id: dateStr,
            date: sessionRecord.date || new Date(dateStr).toISOString(),
            status: 'no-class', // Will be updated based on sessions
            sessions: {
              morning: null,
              afternoon: null
            }
          });
        }
        
        const dayRecord = dayRecordsMap.get(dateStr)!;
        
        if (session === 'morning') {
          dayRecord.sessions.morning = { status: sessionStatus as 'present' | 'absent' };
        } else if (session === 'afternoon') {
          dayRecord.sessions.afternoon = { status: sessionStatus as 'present' | 'absent' };
        }
        
        // Update overall day status based on sessions
        const morningStatus = dayRecord.sessions.morning?.status;
        const afternoonStatus = dayRecord.sessions.afternoon?.status;
        
        if (morningStatus === 'present' || afternoonStatus === 'present') {
          dayRecord.status = 'present';
        } else if (morningStatus === 'absent' || afternoonStatus === 'absent') {
          dayRecord.status = 'absent';
        } else if (morningStatus === 'no-class' && afternoonStatus === 'no-class') {
          dayRecord.status = 'no-class';
        }
      });
      
      const transformedRecords = Array.from(dayRecordsMap.values());
      
      console.log('[STUDENT SERVICE] Transformed records count:', transformedRecords.length);
      console.log('[STUDENT SERVICE] Sample transformed record:', transformedRecords[0]);
      
      // Debug: Log all transformed records with their dates
      transformedRecords.forEach((record, index) => {
        console.log(`[STUDENT SERVICE] Record ${index + 1}: ${record._id} (${new Date(record.date).toISOString().split('T')[0]}) - Status: ${record.status}`, {
          morning: record.sessions.morning?.status || 'null',
          afternoon: record.sessions.afternoon?.status || 'null'
        });
      });
      
      // Sort records by date for proper display
      transformedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate stats from transformed records
      const stats = {
        totalDays: transformedRecords.length,
        presentDays: transformedRecords.filter(r => r.status === 'present').length,
        absentDays: transformedRecords.filter(r => r.status === 'absent').length,
        lateDays: 0,
        halfDays: 0,
        leaveDays: 0,
        attendancePercentage: 0
      };
      
      if (stats.totalDays > 0) {
        stats.attendancePercentage = Math.round((stats.presentDays / stats.totalDays) * 100);
      }
      
      return {
        records: transformedRecords,
        stats: response.data.data.summary || stats
      };
    }
    
    return { records: [], stats: { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, halfDays: 0, leaveDays: 0, attendancePercentage: 0 } };
  } catch (error) {
    console.error('[STUDENT SERVICE] Error fetching attendance:', error);
    return { records: [], stats: { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, halfDays: 0, leaveDays: 0, attendancePercentage: 0 } };
  }
}

export async function getStudentResults(): Promise<Result[]> {
  try {
    console.log('[STUDENT SERVICE] Fetching results...');
    
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) throw new Error('No user data found');
    
    const user = JSON.parse(userData);
    const studentId = user.userId || user._id;
    console.log('[STUDENT SERVICE] User ID for results:', studentId);
    
    // Try multiple endpoints to get results
    let response;
    let rawResults = [];
    
    try {
      // First try the student-specific history endpoint
      response = await api.get(`/results/student/${studentId}/history`);
      console.log('[STUDENT SERVICE] History endpoint response:', response.data);
      
      if (response.data?.success && response.data?.results) {
        rawResults = response.data.results;
      } else if (response.data?.success && Array.isArray(response.data?.data)) {
        rawResults = response.data.data;
      }
      
      // If no results found but endpoint succeeded, it might have created sample data
      // Try again after a short delay
      if (rawResults.length === 0 && response.data?.success) {
        console.log('[STUDENT SERVICE] No results found, retrying after potential sample data creation...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const retryResponse = await api.get(`/results/student/${studentId}/history`);
        console.log('[STUDENT SERVICE] Retry response:', retryResponse.data);
        
        if (retryResponse.data?.success && retryResponse.data?.results) {
          rawResults = retryResponse.data.results;
        } else if (retryResponse.data?.success && Array.isArray(retryResponse.data?.data)) {
          rawResults = retryResponse.data.data;
        }
      }
    } catch (historyError) {
      console.log('[STUDENT SERVICE] History endpoint failed:', historyError);
      
      try {
        // Try alternative student endpoint
        response = await api.get(`/results/student/${studentId}`);
        console.log('[STUDENT SERVICE] Student endpoint response:', response.data);
        
        if (response.data?.success && response.data?.results) {
          rawResults = response.data.results;
        } else if (response.data?.success && Array.isArray(response.data?.data)) {
          rawResults = response.data.data;
        }
      } catch (altError) {
        console.log('[STUDENT SERVICE] Student endpoint failed:', altError);
        
        try {
          // Try general results endpoint with student filtering
          response = await api.get('/results', { params: { studentId } });
          console.log('[STUDENT SERVICE] General results endpoint response:', response.data);
          
          if (response.data?.success && response.data?.data) {
            rawResults = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          } else if (Array.isArray(response.data)) {
            rawResults = response.data;
          }
        } catch (generalError) {
          console.log('[STUDENT SERVICE] All endpoints failed:', generalError);
          return [];
        }
      }
    }
    
    console.log('[STUDENT SERVICE] Raw results count:', rawResults.length);
    console.log('[STUDENT SERVICE] Sample raw result:', rawResults[0]);
    
    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      console.log('[STUDENT SERVICE] No valid results found');
      return [];
    }
    
    // Transform the results to match the expected format
    const transformedResults = rawResults.map((result: any) => {
      console.log('[STUDENT SERVICE] Processing result:', result);
      
      // Handle different result structures
      let subjects = [];
      let examType = 'Exam';
      let overallPercentage = 0;
      let overallGrade = 'N/A';
      let rank = null;
      let academicYear = '2024-25';
      
      // Extract exam type
      if (result.examType) {
        examType = result.examType;
      } else if (result.examDetails?.examType) {
        examType = result.examDetails.examType;
      } else if (result.subjects?.[0]?.testType) {
        examType = result.subjects[0].testType;
      }
      
      // Extract subjects
      if (result.subjects && Array.isArray(result.subjects)) {
        subjects = result.subjects.map((subject: any) => {
          // Handle different subject structures
          let subjectName = subject.subjectName || subject.subject || 'Unknown Subject';
          let marksObtained = 0;
          let totalMarks = 100;
          let grade = subject.grade || '';
          let percentage = 0;
          
          // Extract marks - handle nested structure
          if (subject.total) {
            marksObtained = subject.total.marksObtained || subject.total.obtainedMarks || 0;
            totalMarks = subject.total.maxMarks || subject.total.totalMarks || 100;
            percentage = subject.total.percentage || 0;
            grade = subject.total.grade || grade;
          } else {
            marksObtained = subject.marksObtained || subject.obtainedMarks || 0;
            totalMarks = subject.totalMarks || subject.maxMarks || 100;
            percentage = subject.percentage || 0;
          }
          
          // Calculate percentage if not provided
          if (percentage === 0 && totalMarks > 0) {
            percentage = (marksObtained / totalMarks) * 100;
          }
          
          return {
            subjectName,
            marksObtained,
            totalMarks,
            grade,
            percentage: Math.round(percentage * 100) / 100
          };
        });
      }
      
      // Calculate overall statistics
      if (subjects.length > 0) {
        const totalMarks = subjects.reduce((sum: number, s: any) => sum + s.totalMarks, 0);
        const obtainedMarks = subjects.reduce((sum: number, s: any) => sum + s.marksObtained, 0);
        overallPercentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
        overallGrade = subjects[0]?.grade || 'N/A';
      }
      
      // Extract other fields
      if (result.overallResult) {
        overallPercentage = result.overallResult.percentage || overallPercentage;
        overallGrade = result.overallResult.grade || overallGrade;
        rank = result.overallResult.rank;
      } else if (result.percentage !== undefined) {
        overallPercentage = result.percentage;
      }
      
      if (result.classDetails?.academicYear) {
        academicYear = result.classDetails.academicYear;
      } else if (result.academicYear) {
        academicYear = result.academicYear;
      }
      
      if (result.rank !== undefined) {
        rank = result.rank;
      }
      
      const transformedResult = {
        _id: result._id || result.resultId || `result_${Date.now()}`,
        examType,
        subjects,
        overallPercentage: Math.round(overallPercentage * 100) / 100,
        overallGrade,
        rank,
        academicYear
      };
      
      console.log('[STUDENT SERVICE] Transformed result:', transformedResult);
      return transformedResult;
    });
    
    console.log('[STUDENT SERVICE] Final transformed results count:', transformedResults.length);
    
    return transformedResults;
  } catch (error: any) {
    console.error('[STUDENT SERVICE] Error fetching results:', error);
    console.error('[STUDENT SERVICE] Error response:', error?.response?.data);
    console.error('[STUDENT SERVICE] Error status:', error?.response?.status);
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
