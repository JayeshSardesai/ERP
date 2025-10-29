import api from '../api/axios';

export interface StudentFeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  studentSection: string;
  rollNumber: string;
  feeStructureName: string;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  status: string;
  paymentPercentage: number;
  nextDueDate?: string;
  overdueDays?: number;
  installments: Array<{
    name: string;
    amount: number;
    paidAmount: number;
    dueDate?: string;
    status: string;
  }>;
}

export interface FeeRecordsResponse {
  success: boolean;
  data: {
    records: StudentFeeRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export const getStudentFeeRecords = async (params: {
  class?: string;
  section?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<FeeRecordsResponse> => {
  const response = await api.get('/reports/dues', { params });
  return response.data;
};

export interface SchoolOverview {
  totalStudents: number;
  avgAttendance: number;
}

export async function getSchoolOverview(params?: {
  academicYear?: string;
  class?: string;
  section?: string;
}): Promise<{ success: boolean; data: SchoolOverview }> {
  const res = await api.get('/reports/overview', { params });
  return res.data;
}

export interface SchoolSummary {
  totalStudents: number;
  avgAttendance: number;
  avgMarks: number;
  classWiseDues: Array<{
    className: string;
    totalDues: number;
    paidAmount: number;
    pendingAmount: number;
  }>;
  classes: Array<{
    _id: string;
    name: string;
    sectionCount: number;
    studentCount: number;
  }>;
  sections: Array<{
    _id: string;
    name: string;
    studentCount: number;
    className: string;
  }>;
}

// In frontend/src/api/reports.ts
export interface SchoolSummary {
  totalStudents: number;
  avgAttendance: number;
  avgMarks: number;
  classWiseDues: Array<{
    className: string;
    totalDues: number;
    paidAmount: number;
    pendingAmount: number;
  }>;
  classes: Array<{
    _id: string;
    name: string;
    sectionCount: number;
    studentCount: number;
  }>;
  sections: Array<{
    _id: string;
    name: string;
    studentCount: number;
    className: string;
  }>;
}

export const getSchoolSummary = async (params: {
  academicYear?: string;
  class?: string;
  section?: string;
  from?: string;
  to?: string;
} = {}): Promise<{ success: boolean; data: SchoolSummary }> => {
  try {
    const response = await api.get('/reports/summary', { 
      params: {
        academicYear: params.academicYear,
        targetClass: params.class,  // Changed from class to targetClass
        targetSection: params.section,  // Changed from section to targetSection
        from: params.from,
        to: params.to
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching school summary:', error);
    throw error;
  }
};

export async function getClassSummary(params: any) {
  const res = await api.get('/reports/class-summary', { params });
  return res.data;
}

export async function getAttendanceReport(params?: any) {
  const res = await api.get('/reports/attendance', { params });
  return res.data;
}

export async function getAcademicReport(params?: any) {
  const res = await api.get('/reports/academic', { params });
  return res.data;
}

export async function getGradeDistribution(params?: any) {
  const res = await api.get('/reports/grades', { params });
  return res.data;
}

export async function getTeacherPerformance(params?: any) {
  const res = await api.get('/reports/teachers', { params });
  return res.data;
}

export async function exportFeeRecordsToCSV(params: {
  class?: string;
  section?: string;
  search?: string;
  status?: string;
}): Promise<Blob> {
  // Prepare parameters for the reports export
  const apiParams: any = {
    type: 'dues',
    class: params.class,
    section: params.section,
    status: params.status // The reports controller will handle the case conversion
  };

  // Only include search if it has a value
  if (params.search) {
    apiParams.search = params.search;
  }

  const response = await api.get('/reports/export', {
    params: apiParams,
    responseType: 'blob',
    headers: {
      'Accept': 'text/csv',
    },
  });
  
  // Check if the response is a blob (CSV file)
  if (response.data instanceof Blob) {
    return response.data;
  }
  
  // If we get a JSON response with an error, throw it
  if (response.data && typeof response.data === 'object' && !(response.data instanceof Blob)) {
    const errorData = response.data as { message?: string };
    throw new Error(errorData.message || 'Failed to export data');
  }
  
  // If we get here, the response is not in the expected format
  throw new Error('Unexpected response format from server');
}
