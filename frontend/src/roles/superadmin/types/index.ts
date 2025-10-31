export interface School {
  id: string;
  name: string;
  code: string; // School code - now required
  logo: string;
  area: string;
  district: string;
  pinCode: string;
  mobile: string;
  principalName: string;
  principalEmail: string;
  bankDetails: BankDetails;
  accessMatrix: AccessMatrix;
  schoolType?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  establishedYear?: string;
  affiliationBoard?: string;
  website?: string;
  secondaryContact?: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  accountHolderName: string;
}

export interface AccessMatrix {
  admin: RolePermissions;
  teacher: RolePermissions;
  student: RolePermissions;
  parent: RolePermissions;
}

export interface RolePermissions {
  manageUsers: boolean;
  manageSchoolSettings: boolean | string;
  viewAcademicDetails: boolean;
  viewAttendance: boolean;
  viewAssignments: boolean;
  viewResults: boolean | string;
  viewLeaves: boolean | string;
  messageStudentsParents: boolean;
  viewFees: boolean;
  viewReports: boolean;
}

export interface DashboardStats {
  totalSchools: number;
  totalUsers: number;
  lastLogin: string;
}

export type ViewType =
  | 'dashboard'
  | 'add-school'
  | 'view-access'
  | 'account-details'
  | 'school-details'
  | 'edit-school'
  | 'school-login';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  avatar?: string;
  phone?: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

export interface Teacher extends User {
  role: 'teacher';
  subjects: string[];
  classes: string[];
  experience: number;
}

export interface Student extends User {
  role: 'student';
  class: string;
  rollNumber: string;
  parentId: string;
  dateOfBirth: string;
}

export interface Parent extends User {
  role: 'parent';
  children: string[]; // student IDs
}

export interface Admin extends User {
  role: 'admin';
  permissions: string[];
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface Mark {
  id: string;
  studentId: string;
  subject: string;
  examType: 'quiz' | 'midterm' | 'final' | 'assignment';
  marks: number;
  totalMarks: number;
  date: string;
  teacherId: string;
}

export interface Result {
  id: string;
  studentId: string;
  term: string;
  subjects: {
    subject: string;
    marks: number;
    totalMarks: number;
    grade: string;
  }[];
  totalMarks: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  rank: number;
}

export interface SchoolSettings {
  schoolName: string;
  academicYear: string;
  terms: string[];
  subjects: string[];
  classes: string[];
  gradingSystem: {
    A: { min: number; max: number };
    B: { min: number; max: number };
    C: { min: number; max: number };
    D: { min: number; max: number };
    F: { min: number; max: number };
  };
  attendanceThreshold: number;
  workingDays: string[];
  schoolHours: {
    start: string;
    end: string;
  };
}

export interface SchoolData {
  users: (Teacher | Student | Parent | Admin)[];
  attendance: Attendance[];
  marks: Mark[];
  results: Result[];
  settings: SchoolSettings;
}