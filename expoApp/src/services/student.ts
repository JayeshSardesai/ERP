import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AssignmentAttachment {
  filename?: string;
  originalName: string;
  path: string;
  cloudinaryPublicId?: string;
  size?: number;
  uploadedAt?: string;
}

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
  attachments?: AssignmentAttachment[];
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
      sessionTime?: string;
    } | null;
    afternoon: {
      status: 'present' | 'absent';
      markedAt?: string;
      sessionTime?: string;
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

export interface SchoolInfo {
  schoolName: string;
  schoolCode: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  principalName?: string;
  establishedYear?: string;
  affiliation?: string;
}

export interface FeeRecord {
  _id: string;
  studentId: string;
  academicYear: string;
  totalFees: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate?: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  payments: Array<{
    amount: number;
    paymentDate: string;
    paymentMode: string;
    receiptNumber: string;
  }>;
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
  stats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    leaveDays: number;
    attendancePercentage: number;
    totalSessions?: number;
    presentSessions?: number;
    sessionAttendanceRate?: number;
  };
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


      // Transform session-based records to day-based records
      const dayRecordsMap = new Map<string, AttendanceRecord>();

      // Get user data once before processing records
      const userData = JSON.parse(await AsyncStorage.getItem('userData') || '{}');
      const studentUserId = userData.userId || userData._id;

      rawRecords.forEach((sessionRecord: any) => {
        console.log('[STUDENT SERVICE] Processing raw record:', {
          _id: sessionRecord._id,
          date: sessionRecord.date,
          dateString: sessionRecord.dateString,
          status: sessionRecord.status,
          session: sessionRecord.session,
          sessions: sessionRecord.sessions,
          hasStudents: !!sessionRecord.students,
          studentsCount: sessionRecord.students?.length || 0
        });

        // Use dateString if available, otherwise extract from date
        let dateStr: string;
        if (sessionRecord.dateString) {
          dateStr = sessionRecord.dateString;
        } else if (sessionRecord.date) {
          // Use local date formatting to avoid timezone issues
          const recordDate = new Date(sessionRecord.date);
          const year = recordDate.getFullYear();
          const month = recordDate.getMonth() + 1;
          const day = recordDate.getDate();
          dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          console.log('[STUDENT SERVICE] Generated local date string:', dateStr, 'from:', sessionRecord.date);
        } else {
          console.warn('[STUDENT SERVICE] No date found in record:', sessionRecord);
          return;
        }

        // Extract session and student's status from the record
        let session: string | null = null;
        let sessionStatus: string = 'no-class';

        // Handle day-based records with sessions object (from backend)
        if (sessionRecord.sessions && typeof sessionRecord.sessions === 'object') {
          console.log('[STUDENT SERVICE] Processing day-based record with sessions:', sessionRecord.sessions);
          
          // Create or get the day record
          const dayRecord = dayRecordsMap.get(dateStr) || {
            _id: dateStr,
            date: sessionRecord.date || new Date(dateStr).toISOString(),
            dateString: dateStr,
            status: sessionRecord.status || 'no-class', // Use the backend status or default to 'no-class'
            sessions: { morning: null, afternoon: null }
          };

          // Handle morning session
          if (sessionRecord.sessions.morning && sessionRecord.sessions.morning.status) {
            const morningStatus = sessionRecord.sessions.morning.status;
            if (morningStatus === 'present' || morningStatus === 'absent') {
              dayRecord.sessions.morning = { status: morningStatus };
              console.log('[STUDENT SERVICE] Set morning session:', dayRecord.sessions.morning);
            }
          }

          // Handle afternoon session
          if (sessionRecord.sessions.afternoon && sessionRecord.sessions.afternoon.status) {
            const afternoonStatus = sessionRecord.sessions.afternoon.status;
            if (afternoonStatus === 'present' || afternoonStatus === 'absent') {
              dayRecord.sessions.afternoon = { status: afternoonStatus };
              console.log('[STUDENT SERVICE] Set afternoon session:', dayRecord.sessions.afternoon);
            }
          }

          // Update overall day status based on sessions
          const morningStatus = dayRecord.sessions.morning?.status;
          const afternoonStatus = dayRecord.sessions.afternoon?.status;
          
          if (morningStatus === 'present' || afternoonStatus === 'present') {
            dayRecord.status = 'present';
          } else if ((morningStatus === 'absent' && afternoonStatus === 'absent') || 
                     (morningStatus === 'absent' && !afternoonStatus) || 
                     (afternoonStatus === 'absent' && !morningStatus)) {
            dayRecord.status = 'absent';
          } else {
            dayRecord.status = 'no-class';
          }

          console.log('[STUDENT SERVICE] Final day record:', {
            date: dayRecord.dateString,
            status: dayRecord.status,
            sessions: dayRecord.sessions
          });

          dayRecordsMap.set(dateStr, dayRecord);
          return; // Skip the rest of processing for this record
        }
        // If no sessions object found, create a basic attendance record
        else {
          console.log('[STUDENT SERVICE] No sessions object found, creating basic record for:', sessionRecord._id);
          
          // Create a basic day record with the status from the record itself
          const basicStatus = sessionRecord.status || 'no-class';
          const dayRecord = dayRecordsMap.get(dateStr) || {
            _id: dateStr,
            date: sessionRecord.date || new Date(dateStr).toISOString(),
            dateString: dateStr,
            status: basicStatus,
            sessions: { morning: null, afternoon: null }
          };
          
          // If we have a direct status, use it
          if (sessionRecord.status && ['present', 'absent', 'half_day', 'no-class'].includes(sessionRecord.status)) {
            dayRecord.status = sessionRecord.status;
          }
          
          console.log('[STUDENT SERVICE] Created basic day record:', {
            date: dayRecord.dateString,
            status: dayRecord.status,
            originalStatus: sessionRecord.status
          });
          
          dayRecordsMap.set(dateStr, dayRecord);
        }
      });

      const transformedRecords = Array.from(dayRecordsMap.values());
      
      console.log('[STUDENT SERVICE] Final transformed records:');
      transformedRecords.forEach(record => {
        console.log(`[STUDENT SERVICE] ${record.dateString}: ${record.status} - Morning: ${record.sessions.morning?.status || 'null'}, Afternoon: ${record.sessions.afternoon?.status || 'null'}`);
      });



      // Sort records by date for proper display (most recent first)
      transformedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // STRICT filtering - only return records within the exact requested date range
      let filteredRecords: AttendanceRecord[] = [];
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Set time boundaries
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        console.log('[STUDENT SERVICE] STRICT filtering for range:', start.toDateString(), 'to', end.toDateString());

        filteredRecords = transformedRecords.filter(record => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);

          const isInRange = recordDate >= start && recordDate <= end;

          console.log('[STUDENT SERVICE] Record:', record.dateString, 'In range:', isInRange);

          return isInRange;
        });

        console.log('[STUDENT SERVICE] FINAL filtered records:', filteredRecords.length, 'from', transformedRecords.length);
      } else {
        // If no date range specified, return empty array to prevent showing old data
        console.log('[STUDENT SERVICE] No date range specified - returning empty array');
        filteredRecords = [];
      }

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
        records: filteredRecords,
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
    // Try multiple endpoints to get results
    let response;
    let rawResults = [];

    try {
      // Use the same approach as the website - /results endpoint with params
      const userData = JSON.parse(await AsyncStorage.getItem('userData') || '{}');
      const schoolCode = await AsyncStorage.getItem('schoolCode') || '';

      // First try the general results endpoint like the website does
      response = await api.get('/results', {
        params: {
          schoolCode: schoolCode.toUpperCase(),
          studentId: studentId
        }
      });
      if (response.data?.success && response.data?.data) {
        rawResults = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
      } else if (response.data?.results) {
        rawResults = Array.isArray(response.data.results) ? response.data.results : [response.data.results];
      } else if (Array.isArray(response.data)) {
        rawResults = response.data;
      }

      // If no results found, try the student-specific endpoint as fallback
      if (rawResults.length === 0) {
        try {
          response = await api.get(`/results/student/${studentId}/history`);

          if (response.data?.success && response.data?.results) {
            rawResults = response.data.results;
          } else if (response.data?.success && Array.isArray(response.data?.data)) {
            rawResults = response.data.data;
          }
        } catch (studentError) {
          console.log('[STUDENT SERVICE] Student endpoint also failed:', studentError);
        }
      }
    } catch (error) {
      console.log('[STUDENT SERVICE] Results fetching failed:', error);
      return [];
    }

    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      return [];
    }

    // Filter out placeholder records and invalid results
    const validResults = rawResults.filter((result: any) => {
      // Skip placeholder records by flag
      if (result._placeholder === true) {
        console.log('[STUDENT SERVICE] Skipping placeholder result:', result._id);
        return false;
      }

      // Skip placeholder records by description
      if (result.note && result.note.includes('Placeholder for results collection')) {
        console.log('[STUDENT SERVICE] Skipping placeholder result by description:', result._id);
        return false;
      }

      // Skip results without proper structure
      if (!result.subjects || !Array.isArray(result.subjects) || result.subjects.length === 0) {
        console.log('[STUDENT SERVICE] Skipping result without subjects:', result._id);
        return false;
      }

      // Skip frozen placeholder results (additional check)
      if (result.frozen && result.note && result.note.includes('Placeholder')) {
        console.log('[STUDENT SERVICE] Skipping frozen placeholder result:', result._id);
        return false;
      }

      return true;
    });

    console.log('[STUDENT SERVICE] Filtered results count:', validResults.length, 'from', rawResults.length);

    // Transform the results to match the expected format
    const transformedResults = validResults.map((result: any) => {

      // Handle different result structures
      let subjects = [];
      let examType = 'Exam';
      let overallPercentage = 0;
      let overallGrade = 'N/A';
      let rank = null;
      let academicYear = '2024-25';

      // Extract exam type - prioritize testType from subjects
      if (result.subjects?.[0]?.testType) {
        examType = result.subjects[0].testType;
      } else if (result.examType) {
        examType = result.examType;
      } else if (result.term) {
        examType = result.term;
      } else if (result.examDetails?.examType) {
        examType = result.examDetails.examType;
      } else {
        examType = 'Exam'; // Default fallback
      }


      // Extract subjects
      if (result.subjects && Array.isArray(result.subjects)) {
        subjects = result.subjects.map((subject: any) => {
          // Handle different subject structures
          let subjectName = subject.subjectName || subject.name || subject.subject || 'Unknown Subject';
          let marksObtained = 0;
          let totalMarks = 100;
          let grade = subject.grade || '';
          let percentage = 0;

          // Extract marks - handle the exact database structure
          marksObtained = subject.obtainedMarks || subject.marksObtained || 0;
          totalMarks = subject.maxMarks || subject.totalMarks || 100;
          percentage = subject.percentage || 0;
          grade = subject.grade || '';

          // Handle nested structure if exists
          if (subject.total) {
            marksObtained = subject.total.marksObtained || subject.total.obtainedMarks || marksObtained;
            totalMarks = subject.total.maxMarks || subject.total.totalMarks || totalMarks;
            percentage = subject.total.percentage || percentage;
            grade = subject.total.grade || grade;
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

      // Calculate overall statistics - use result's direct values first
      if (result.percentage !== undefined) {
        overallPercentage = result.percentage;
      } else if (result.totalMarks && result.maxMarks) {
        overallPercentage = (result.totalMarks / result.maxMarks) * 100;
      } else if (subjects.length > 0) {
        const totalMarks = subjects.reduce((sum: number, s: any) => sum + s.totalMarks, 0);
        const obtainedMarks = subjects.reduce((sum: number, s: any) => sum + s.marksObtained, 0);
        overallPercentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      }

      // Extract grade
      if (result.grade) {
        overallGrade = result.grade;
      } else if (result.overallResult?.grade) {
        overallGrade = result.overallResult.grade;
      } else if (subjects.length > 0 && subjects[0]?.grade) {
        overallGrade = subjects[0].grade;
      }

      // Extract rank
      if (result.rank !== undefined) {
        rank = result.rank;
      } else if (result.overallResult?.rank) {
        rank = result.overallResult.rank;
      }

      // Extract academic year
      if (result.academicYear) {
        academicYear = result.academicYear;
      } else if (result.classDetails?.academicYear) {
        academicYear = result.classDetails.academicYear;
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

      console.log('[STUDENT SERVICE] Transformed result:', {
        id: transformedResult._id,
        examType: transformedResult.examType,
        subjectsCount: transformedResult.subjects.length,
        overallPercentage: transformedResult.overallPercentage,
        grade: transformedResult.overallGrade,
        rank: transformedResult.rank
      });
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
    const response = await api.get('/messages/student');

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

export async function getSchoolInfo(): Promise<SchoolInfo | null> {
  try {
    const response = await api.get('/schools/database/school-info');
    return response.data.data || response.data || null;
  } catch (error) {
    console.error('Error fetching school info:', error);
    return null;
  }
}

export async function getStudentFees(): Promise<FeeRecord | null> {
  try {
    const response = await api.get('/fees/my-fees');
    return response.data.data || response.data || null;
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return null;
  }
}

export interface StudentProfile {
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
    whatsappNumber?: string;
  };
  address?: {
    permanent?: {
      street?: string;
      area?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
      landmark?: string;
    };
    current?: any;
  };
  identity?: {
    aadharNumber?: string;
    panNumber?: string;
  };
  studentDetails?: any;
  isActive?: boolean;
  lastLogin?: string;
}

/**
 * Fetch student profile from students collection in school database
 * This fetches the complete student data from the school's students collection
 * Uses the reports endpoint which queries the students collection
 */
export async function getStudentProfile(): Promise<StudentProfile | null> {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) throw new Error('No user data found');

    const user = JSON.parse(userData);
    const userId = user.userId || user._id;

    if (!userId) {
      throw new Error('Missing userId');
    }

    console.log('[STUDENT SERVICE] Fetching student profile from students collection...');
    console.log('[STUDENT SERVICE] userId:', userId);

    // Fetch from students collection using student-specific endpoint
    // This endpoint queries the students collection in the school database
    // Path: /api/users/my-profile (student-specific, no userId needed)
    const response = await api.get('/users/my-profile');

    console.log('[STUDENT SERVICE] Student profile response:', response.data);

    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }

    return response.data || null;
  } catch (error: any) {
    console.error('[STUDENT SERVICE] Error fetching student profile:', error);
    console.error('[STUDENT SERVICE] Error response:', error?.response?.data);
    console.error('[STUDENT SERVICE] Error status:', error?.response?.status);
    return null;
  }
}