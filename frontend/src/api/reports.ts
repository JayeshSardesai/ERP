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
  const response = await api.get('/fees/records', { params });
  return response.data;
};

export async function getSchoolSummary(params: any) {
  const res = await api.get('/reports/summary', { params });
  return res.data;
}

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
