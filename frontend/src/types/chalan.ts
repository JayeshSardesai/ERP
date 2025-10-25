export interface Chalan {
  _id: string;
  chalanNumber: string;
  studentId: string;
  studentUserId: string;
  class: string;
  section: string;
  totalAmount: number;
  installmentName?: string;
  dueDate: string;
  status: 'unpaid' | 'paid';
  paymentId?: string;
  generatedBy: string;
  schoolId: string;
  copies: {
    student: string;
    office: string;
    admin: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GenerateChalanData {
  class: string;
  section: string;
  installmentName?: string;
  dueDate: string;
  studentIds: string[];
}
