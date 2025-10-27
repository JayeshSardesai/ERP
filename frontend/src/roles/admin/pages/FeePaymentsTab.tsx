import React, { useState } from 'react';
import { Search, Plus, X, FileText, Receipt } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import ClassSectionSelect from '../components/ClassSectionSelect';
import { feesAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import DualCopyReceipt from '../../../components/receipts/DualCopyReceipt';

const FeePaymentsTab: React.FC = () => {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  console.log('FeePaymentsTab render');

  // Real data from API
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state for recording payments
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<any | null>(null);
  const [selectedInstallmentName, setSelectedInstallmentName] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payDate, setPayDate] = useState<string>('');
  const [payRef, setPayRef] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // History modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<any | null>(null);
  const [historyInstallmentName, setHistoryInstallmentName] = useState<string>('');
  const [historyStudent, setHistoryStudent] = useState<any | null>(null);

  // Receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState<string>('');

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await feesAPI.getStudentFeeRecords({
        class: selectedClass,
        section: selectedSection,
        search: searchTerm,
        limit: 50,
      });
      const data = res.data?.data?.records || [];
      const mapped = data.map((r: any) => ({
        id: r.id, // Keep the fee record ID as id for backward compatibility
        studentId: r.studentId || r.student?._id || r.userId, // Add student ID from student collection
        userId: r.userId, // Also store userId separately if available
        name: r.studentName,
        class: r.studentClass,
        section: r.studentSection,
        rollNumber: r.rollNumber,
        totalAmount: r.totalAmount,
        totalPaid: r.totalPaid,
        balance: r.totalPending,
        status: r.status,
        installments: r.installments || [],
      }));
      setStudents(mapped);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load fee records');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };


  const generateReceiptData = async (receiptNumber: string) => {
    try {
      if (!historyRecord) {
        toast.error('No payment history available');
        return;
      }

      // Find the specific payment by receipt number
      let targetPayment = null;
      let targetInstallment = null;

      // Search through all installments and their payments
      for (const inst of (historyRecord.installments || [])) {
        for (const payment of (inst.payments || [])) {
          if (payment.receiptNumber === receiptNumber) {
            targetPayment = payment;
            targetInstallment = inst;
            break;
          }
        }
        if (targetPayment) break;
      }

      // Also search in the payments array directly
      if (!targetPayment && historyRecord.payments) {
        for (const payment of historyRecord.payments) {
          if (payment.receiptNumber === receiptNumber) {
            targetPayment = payment;
            // Find the installment for this payment
            targetInstallment = (historyRecord.installments || []).find((inst: any) => 
              inst.name === payment.installmentName
            );
            break;
          }
        }
      }

      if (!targetPayment) {
        toast.error('Payment not found');
        return;
      }

      // Get school data
      const schoolData = {
        schoolName: user?.schoolName || 'School Name',
        schoolCode: user?.schoolCode || 'SCH001',
        address: '123 School Street, City, State 12345',
        phone: '+91-XXXXXXXXXX',
        email: 'info@school.com',
        website: 'www.edulogix.com'
      };

      // Try to get school info from template settings
      try {
        const saved = localStorage.getItem('universalTemplate');
        if (saved) {
          const templateSettings = JSON.parse(saved);
          schoolData.schoolName = templateSettings.schoolName || schoolData.schoolName;
          schoolData.schoolCode = templateSettings.schoolCode || schoolData.schoolCode;
          schoolData.address = templateSettings.address || schoolData.address;
          schoolData.phone = templateSettings.phone || schoolData.phone;
          schoolData.email = templateSettings.email || schoolData.email;
          schoolData.website = templateSettings.website || schoolData.website;
        }
      } catch (error) {
        console.log('Failed to load template settings, using defaults');
      }

      // Student ID handling - prioritize userId from student collection
      let studentId = '';
      
      // Debug: Log available student data
      console.log('Student ID Debug - historyRecord:', {
        sequenceNumber: historyRecord.sequenceNumber,
        studentUniqueId: historyRecord.studentUniqueId,
        enrollmentNo: historyRecord.enrollmentNo,
        admissionNo: historyRecord.admissionNo,
        studentId: historyRecord.studentId,
        userId: historyRecord.userId,
        rollNumber: historyRecord.rollNumber,
        studentRollNumber: historyRecord.studentRollNumber,
        studentName: historyRecord.studentName
      });
      
      console.log('Student ID Debug - historyStudent:', historyStudent);
      
      // Try to fetch complete student data if we have a userId
      let completeStudentData = historyStudent;
      
      // Debug: Check what userId sources we have
      console.log('Student ID Debug - Available userId sources:', {
        'historyRecord.userId': historyRecord.userId,
        'historyStudent?.userId': historyStudent?.userId,
        'historyRecord.studentId': historyRecord.studentId,
        'historyRecord._id': historyRecord._id
      });
      
      // Try multiple approaches to get the userId
      const userIdToFetch = historyRecord.userId || historyRecord.studentId || historyRecord._id;
      
      // First, check if we already have userId in the fee record
      if (historyRecord.userId && historyRecord.userId !== 'undefined' && historyRecord.userId !== 'null') {
        console.log('Student ID Debug - Found userId in fee record:', historyRecord.userId);
        completeStudentData = { userId: historyRecord.userId };
      } else if (userIdToFetch && !historyStudent?.userId) {
        try {
          console.log('Fetching complete student data using userId:', userIdToFetch);
          
          // Try to get all students and find the one with matching userId
          const allStudentsResponse = await feesAPI.getStudentFeeRecords({});
          const allStudents = allStudentsResponse.data?.data || [];
          
          // Look for student with matching userId in the fee records
          const matchingStudent = allStudents.find(student => 
            student.userId === userIdToFetch || 
            student.studentId === userIdToFetch ||
            student._id === userIdToFetch
          );
          
          if (matchingStudent) {
            console.log('Found matching student in fee records:', matchingStudent);
            completeStudentData = matchingStudent;
          } else {
            // Fallback to the original API call
            const studentDataResponse = await feesAPI.getStudentByUserId(userIdToFetch);
            completeStudentData = studentDataResponse.data?.data;
            console.log('Complete student data from students collection:', completeStudentData);
          }
          
          // If we still don't have userId, try to find it in the response
          if (!completeStudentData?.userId && completeStudentData) {
            const studentData = completeStudentData;
            console.log('Student data structure:', {
              userId: studentData.userId,
              _id: studentData._id,
              studentId: studentData.studentId,
              allKeys: Object.keys(studentData)
            });
          }
        } catch (error) {
          console.log('Failed to fetch complete student data:', error);
          console.log('Using existing data:', historyStudent);
        }
      }
      
      // Priority order for Student ID extraction:
      // 1. userId from student collection (this is the actual Student ID like "SK-S-0850")
      // 2. Other valid student identifiers
      const possibleIds = [
        completeStudentData?.userId,  // This is the primary Student ID from student collection
        historyRecord.userId,         // Fallback to fee record userId
        historyRecord.sequenceNumber,
        historyRecord.studentUniqueId,
        historyRecord.enrollmentNo,
        historyRecord.admissionNo,
        historyRecord.studentId,
        historyRecord.rollNumber,
        historyRecord.studentRollNumber,
        completeStudentData?.studentId,
        completeStudentData?.studentDetails?.studentId,
        completeStudentData?.rollNumber,
        completeStudentData?.studentDetails?.rollNumber
      ].filter(id => id && id !== 'undefined' && id !== 'null' && !/^[a-fA-F0-9]{24}$/.test(id));
      
      console.log('Student ID Debug - possibleIds:', possibleIds);
      console.log('Student ID Debug - completeStudentData:', completeStudentData);
      
      if (possibleIds.length > 0) {
        // Use the first valid ID found
        studentId = String(possibleIds[0]).trim();
        console.log('Student ID Debug - Using found ID:', studentId);
      } else {
        console.log('Student ID Debug - No valid IDs found, using fallback logic');
        // Fallback: generate a meaningful ID using school code and roll number
        const schoolCode = ((schoolData.schoolCode || 'SC').toString().trim() || 'SC').toUpperCase();
        
        // Try to extract roll number from various sources
        let rawRoll = '';
        const rollSources = [
          historyRecord.rollNumber,
          historyRecord.studentRollNumber,
          completeStudentData?.rollNumber,
          completeStudentData?.studentDetails?.rollNumber
        ];
        
        for (const source of rollSources) {
          if (source && source !== 'undefined' && source !== 'null') {
            rawRoll = String(source).trim();
            break;
          }
        }
        
        // If no roll number, try to extract from admission/enrollment numbers
        if (!rawRoll) {
          const source = String(historyRecord.admissionNo || historyRecord.enrollmentNo || '');
          const digits = (source.match(/\d+/g) || []).join('');
          rawRoll = digits.slice(-4);
        }
        
        // Generate student ID
        if (rawRoll) {
          const n = parseInt(rawRoll, 10);
          const padded = Number.isFinite(n) ? n.toString().padStart(4, '0') : rawRoll.padStart(4, '0');
          studentId = `${schoolCode}-S-${padded}`;
          console.log('Student ID Debug - Generated from roll number:', studentId);
        } else {
          // Last resort: use student name initials + sequence
          const nameInitials = (historyRecord.studentName || 'STU').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const timestamp = Date.now().toString().slice(-4);
          studentId = `${schoolCode}-${nameInitials}-${timestamp}`;
          console.log('Student ID Debug - Generated from name initials:', studentId, 'from name:', historyRecord.studentName);
        }
      }
      
      console.log('Student ID Debug - Final studentId:', studentId);

      // Prepare student data
      const studentData = {
        name: historyRecord.studentName,
        studentId: studentId,
        class: historyRecord.studentClass,
        section: historyRecord.studentSection,
        academicYear: historyRecord.academicYear || `${new Date().getFullYear()}-${String((new Date().getFullYear()+1)).slice(-2)}`
      };

      // Prepare payment data with proper date handling
      const paymentDate = targetPayment.paymentDate || targetPayment.date;
      const currentDate = new Date();
      
      // Better date validation and handling
      let finalPaymentDate;
      if (paymentDate) {
        const parsedDate = new Date(paymentDate);
        // Check if the date is valid and not in the future (unless it's today)
        if (!isNaN(parsedDate.getTime()) && parsedDate <= currentDate) {
          finalPaymentDate = paymentDate;
        } else {
          // If date is invalid or in future, use current date
          finalPaymentDate = currentDate.toISOString();
        }
      } else {
        // No payment date found, use current date
        finalPaymentDate = currentDate.toISOString();
      }

      const paymentData = {
        receiptNumber: receiptNumber,
        paymentDate: finalPaymentDate,
        paymentMethod: targetPayment.paymentMethod || targetPayment.method || 'Cash',
        paymentReference: targetPayment.paymentReference || targetPayment.reference || '-',
        amount: targetPayment.amount || 0,
        installmentName: targetInstallment?.name || targetPayment.installmentName || 'N/A'
      };

      // Debug: Log the payment date to see what we're getting
      console.log('Payment date from database:', paymentDate);
      console.log('Final payment date:', paymentData.paymentDate);
      console.log('Current date:', currentDate.toISOString());

      // Prepare installment details
      const installmentDetails = (historyRecord.installments || []).map((inst: any) => ({
        name: inst.name,
        amount: inst.amount || 0,
        paid: inst.paidAmount || 0,
        remaining: Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0)),
        isCurrent: inst.name === targetInstallment?.name
      }));

      // Calculate totals
      const totalAmount = historyRecord.totalAmount || 0;
      const totalPaid = historyRecord.totalPaid || 0;
      const totalRemaining = Math.max(0, totalAmount - totalPaid);

      // Set receipt data and open modal
      setReceiptData({
        schoolData,
        studentData,
        paymentData,
        installments: installmentDetails,
        totalAmount,
        totalPaid,
        totalRemaining
      });
      setSelectedReceiptNumber(receiptNumber);
      setIsReceiptOpen(true);

    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to generate receipt data');
    }
  };

  const handleDownloadReceipt = async (receiptNumber: string) => {
    await generateReceiptData(receiptNumber);
  };


  const generateSimpleReceiptForStudent = (studentData: any, paymentData: any) => {
    // Create professional HTML receipt using FeeStructureTab styling
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Payment Receipt</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0; 
            padding: 0;
            line-height: 1.5;
            color: #374151;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 24px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 32px; 
            padding-bottom: 24px;
            border-bottom: 2px solid #e5e7eb;
          }
          .school-name { 
            font-size: 28px; 
            font-weight: 700; 
            margin-bottom: 8px; 
            color: #111827;
          }
          .receipt-title { 
            font-size: 20px; 
            font-weight: 600; 
            color: #6b7280;
            margin-bottom: 16px;
          }
          .receipt-number {
            background: #dbeafe;
            color: #1e40af;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            display: inline-block;
          }
          .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-bottom: 32px;
          }
          .section {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #d1d5db;
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 12px;
            padding: 8px 0;
          }
          .label { 
            font-weight: 500; 
            color: #6b7280;
          }
          .value {
            color: #111827;
            font-weight: 500;
          }
          .amount-section {
            background: #dbeafe;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 24px 0;
          }
          .amount { 
            font-size: 24px; 
            font-weight: 700; 
            color: #1d4ed8; 
            margin: 8px 0;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 12px; 
            color: #6b7280; 
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          .success-badge {
            background: #dcfce7;
            color: #166534;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="school-name">${user?.schoolName || 'School Name'}</div>
            <div class="receipt-title">Payment Receipt</div>
            <div class="receipt-number">Receipt #${paymentData.receiptNumber}</div>
          </div>
          
          <div class="content-grid">
            <div class="section">
              <div class="section-title">Student Information</div>
              <div class="detail-row">
                <span class="label">Student Name</span>
                <span class="value">${studentData.name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Class & Section</span>
                <span class="value">${studentData.class}-${studentData.section}</span>
              </div>
              <div class="detail-row">
                <span class="label">Academic Year</span>
                <span class="value">2024-25</span>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">Payment Details</div>
              <div class="detail-row">
                <span class="label">Payment Date</span>
                <span class="value">${new Date(paymentData.paymentDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payment Method</span>
                <span class="value">${paymentData.paymentMethod}</span>
              </div>
              <div class="detail-row">
                <span class="label">Reference</span>
                <span class="value">-</span>
              </div>
            </div>
          </div>
          
          <div class="amount-section">
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Amount Paid</div>
            <div class="amount">₹${(paymentData.totalPaid || 0).toLocaleString('en-IN')}</div>
            <div class="success-badge">Payment Successful</div>
          </div>
          
          <div class="footer">
            <p><strong>This is a computer generated receipt.</strong></p>
            <p>Thank you for your payment!</p>
            <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate PDF using browser's print to PDF functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      };
      
      // Note: User will need to select "Save as PDF" in print dialog
      toast.success('Receipt ready for download - Select "Save as PDF" in the print dialog');
    } else {
      // Fallback: create downloadable HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${paymentData.receiptNumber}.html`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded as HTML - Open in browser and print to PDF');
    }
  };

  const handleGenerateInvoice = async (student: any) => {
    try {
      // Fetch detailed student data from database
      // Try to use studentId first, fall back to id if not available
      const studentResponse = await feesAPI.getStudentFeeRecord(student.studentId || student.id);
      const studentDetails = studentResponse.data?.data;

      if (!studentDetails) {
        toast.error('Failed to fetch student details');
        return;
      }

      // Fetch complete student data from students collection using userId
      let completeStudentData = null;
      try {
        if (studentDetails.userId) {
          console.log('Fetching complete student data using userId:', studentDetails.userId);
          const studentDataResponse = await feesAPI.getStudentByUserId(studentDetails.userId);
          completeStudentData = studentDataResponse.data?.data;
          console.log('Complete student data from students collection:', completeStudentData);
        }
      
      } catch (error) {
        console.log('Failed to fetch complete student data, using fee record data');
      }

      // Create fee structure from paid installments with detailed payment info
      const paidInstallments = (studentDetails.installments || [])
        .filter((inst: any) => inst.paidAmount > 0);

      if (paidInstallments.length === 0) {
        toast.error('No payments found for this student');
        return;
      }

      // Get the latest payment details
      const latestPayment = paidInstallments[paidInstallments.length - 1];
      const paymentHistory = latestPayment.payments || [];
      const recentPayment = paymentHistory[paymentHistory.length - 1];

      // Create comprehensive student data using students collection data
      const studentData = {
        name: completeStudentData?.name?.displayName || 
              studentDetails.studentName || 
              student.name,
        rollNumber: completeStudentData?.studentDetails?.rollNumber || 
                   studentDetails.rollNumber || 
                   student.rollNumber || 
                   'N/A',
        sequenceNumber: completeStudentData?.userId || 
                       studentDetails.userId || 
                       `SEQ-${String(student.id || Date.now()).slice(-4)}`,
        class: completeStudentData?.studentDetails?.currentClass || 
               studentDetails.studentClass || 
               student.class,
        section: completeStudentData?.studentDetails?.currentSection || 
                studentDetails.studentSection || 
                student.section,
        academicYear: completeStudentData?.studentDetails?.academicYear || 
                     studentDetails.academicYear || 
                     '2024-2025',
        address: completeStudentData?.address?.permanent ? 
                `${completeStudentData.address.permanent.street || ''} ${completeStudentData.address.permanent.city || ''} ${completeStudentData.address.permanent.state || ''} ${completeStudentData.address.permanent.pincode || ''}`.trim() ||
                `Class ${completeStudentData?.studentDetails?.currentClass || student.class}-${completeStudentData?.studentDetails?.currentSection || student.section}` :
                `Class ${studentDetails.studentClass || student.class}-${studentDetails.studentSection || student.section}`,
        email: completeStudentData?.email || 
               completeStudentData?.studentDetails?.fatherEmail ||
               completeStudentData?.studentDetails?.motherEmail ||
               studentDetails.email || 
               studentDetails.contactEmail || 
               studentDetails.parentEmail || 
               student.email || 
               'student@school.com',
        phone: completeStudentData?.contact?.primaryPhone || 
               completeStudentData?.studentDetails?.fatherPhone ||
               completeStudentData?.studentDetails?.motherPhone ||
               studentDetails.phone || 
               studentDetails.contactNumber || 
               studentDetails.parentPhone || 
               student.phone || 
               '+91-XXXXXXXXXX',
        parentName: completeStudentData?.studentDetails?.fatherName || 
                   completeStudentData?.studentDetails?.guardianName ||
                   studentDetails.parentName || 
                   studentDetails.guardianName || 
                   student.parentName || 
                   'Parent Name'
      };

      // Create fee structure with payment details
      const feeStructure = paidInstallments.map((inst: any) => ({
        feeName: inst.name,
        amount: inst.paidAmount || 0,
        totalAmount: inst.amount || 0,
        pendingAmount: (inst.amount || 0) - (inst.paidAmount || 0),
        payments: inst.payments || []
      }));

      // Payment data with receipt information
      const paymentData = {
        receiptNumber: recentPayment?.receiptNumber || `RCP-${user?.schoolCode}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        paymentDate: recentPayment?.date || new Date().toISOString().split('T')[0],
        paymentMethod: recentPayment?.method || 'cash',
        reference: recentPayment?.reference || '-',
        totalPaid: studentDetails.totalPaid || 0,
        totalFees: studentDetails.totalAmount || 0,
        remainingFees: (studentDetails.totalAmount || 0) - (studentDetails.totalPaid || 0)
      };

      // Fetch school data from school_info collection
      let schoolData = {
        schoolName: user?.schoolName || 'School Name',
        schoolCode: user?.schoolCode || 'SCH001',
        address: '123 School Street, City, State 12345',
        phone: '+91-XXXXXXXXXX',
        email: 'info@school.com',
        website: 'www.school.com'
      };

      try {
        console.log('Fetching school info from classes endpoint for invoice...');
        const schoolResponse = await feesAPI.getSchoolInfo(user?.schoolCode);
        
        if (schoolResponse.data?.success && schoolResponse.data?.data) {
          const data = schoolResponse.data.data;
          console.log('School data found for invoice:', data);
          
          schoolData = {
            schoolName: data.schoolName || data.school?.name || user?.schoolName || 'School Name',
            schoolCode: data.schoolCode || data.school?.code || user?.schoolCode || 'SCH001',
            address: data.school?.address || data.address || '123 School Street, City, State 12345',
            phone: data.school?.phone || data.phone || '+91-XXXXXXXXXX',
            email: data.school?.email || data.email || 'info@school.com',
            website: data.school?.website || data.website || 'www.school.com'
          };
        } else {
          // Fallback to template settings
          const saved = localStorage.getItem('universalTemplate');
          if (saved) {
            const templateSettings = JSON.parse(saved);
            schoolData = {
              schoolName: templateSettings.schoolName || schoolData.schoolName,
              schoolCode: templateSettings.schoolCode || schoolData.schoolCode,
              address: templateSettings.address || schoolData.address,
              phone: templateSettings.phone || schoolData.phone,
              email: templateSettings.email || schoolData.email,
              website: templateSettings.website || schoolData.website
            };
          }
        }
      } catch (error) {
        console.log('Failed to fetch school info, using template settings fallback');
        try {
          const saved = localStorage.getItem('universalTemplate');
          if (saved) {
            const templateSettings = JSON.parse(saved);
            schoolData = {
              schoolName: templateSettings.schoolName || schoolData.schoolName,
              schoolCode: templateSettings.schoolCode || schoolData.schoolCode,
              address: templateSettings.address || schoolData.address,
              phone: templateSettings.phone || schoolData.phone,
              email: templateSettings.email || schoolData.email,
              website: templateSettings.website || schoolData.website
            };
          }
        } catch (settingsError) {
          console.log('Failed to load template settings, using defaults');
        }
      }

      // Generate simple receipt instead of complex invoice
      generateSimpleReceiptForStudent(studentData, paymentData);
      toast.success('Receipt generated successfully!');
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    }
  };

  const openHistoryModal = async (student: any) => {
    try {
      setHistoryLoading(true);
      setIsHistoryOpen(true);
      setHistoryStudent(student);
      
      // Use studentId if available, otherwise fall back to id
      const res = await feesAPI.getStudentFeeRecord(student.studentId || student.id);
      const rec = res.data?.data;
      setHistoryRecord(rec || null);
      const firstInst = (rec?.installments || [])[0];
      setHistoryInstallmentName(firstInst?.name || '');
      
      // If we already have a roll number, we're done
      if (student?.rollNumber) return;
      
      try {
        // First try to get rollNumber from the fee record data
        const rollNumberFromRecord = rec?.student?.rollNumber || rec?.studentDetails?.rollNumber;
        if (rollNumberFromRecord) {
          setHistoryStudent((prev: any) => ({ ...(prev || {}), rollNumber: rollNumberFromRecord }));
          return;
        }
        
        // Fallback: try to get from student ID or user ID
        const userId = rec?.userId || rec?.student?.userId || rec?.studentId || student.id;
        if (!userId) return;
        
        // Try to get roll number from other fields as a last resort
        const possibleRollNumber = 
          rec?.rollNumber || 
          rec?.student?.rollNumber || 
          rec?.studentDetails?.rollNumber ||
          String(rec?.admissionNo || '').slice(-4) ||
          String(rec?.enrollmentNo || '').slice(-4);
          
        if (possibleRollNumber) {
          setHistoryStudent((prev: any) => ({ ...(prev || {}), rollNumber: possibleRollNumber }));
        }
      } catch (error) {
        console.log('Error processing roll number:', error);
        // Continue without rollNumber - it's not critical for receipt generation
      }
    } catch (error: any) {
      console.error('Error in openHistoryModal:', error);
      toast.error(error?.response?.data?.message || 'Failed to load payment history');
      setIsHistoryOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSection]);

  // naive debounce for search
  React.useEffect(() => {
    const t = setTimeout(() => fetchRecords(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const openPaymentModal = (student: any) => {
    setActiveStudent(student);
    setPayMethod('cash');
    setPayDate(new Date().toISOString().split('T')[0]); // Set today's date as default
    setPayRef('');
    // Auto-select first pending installment if available
    const list = student.installments || [];
    const firstPending = list.find((inst: any) => {
      const pending = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
      return pending > 0;
    }) || list[0];
    if (firstPending) {
      const pending = Math.max(0, (firstPending.amount || 0) - (firstPending.paidAmount || 0));
      setSelectedInstallmentName(firstPending.name || '');
      setPayAmount(String(pending || ''));
    } else {
      setSelectedInstallmentName('');
      setPayAmount('');
    }
    setIsModalOpen(true);
  };

  const closePaymentModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setActiveStudent(null);
  };

  const onSelectInstallment = (inst: any) => {
    const pending = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
    setSelectedInstallmentName(inst.name);
    setPayAmount(String(pending || ''));
  };

  const handleSubmitPayment = async () => {
    if (!activeStudent) return;
    const amt = Number(payAmount);
    if (!selectedInstallmentName) return toast.error('Select an installment');
    if (Number.isNaN(amt) || amt <= 0) return toast.error('Enter a valid amount');
    if (!payDate || payDate.trim() === '') return toast.error('Payment date is required');
    
    // Optional: Validate that payment date is not in the future
    const paymentDate = new Date(payDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (paymentDate > today) {
      return toast.error('Payment date cannot be in the future');
    }
    
    const inst = (activeStudent.installments || []).find((i: any) => i.name === selectedInstallmentName);
    if (inst) {
      const pendingForInst = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
      if (amt > pendingForInst) return toast.error(`Amount cannot exceed pending (${formatCurrency(pendingForInst)})`);
    }
    const methodsRequiringRef = ['cheque', 'bank_transfer', 'online'];
    if (methodsRequiringRef.includes(payMethod) && !String(payRef || '').trim()) {
      return toast.error('Reference / Remarks is required for Cheque, Bank Transfer, and Online payments');
    }
    try {
      setSubmitting(true);
      await feesAPI.recordOfflinePayment(activeStudent.id, {
        installmentName: selectedInstallmentName,
        amount: amt,
        paymentMethod: payMethod,
        paymentDate: payDate,
        paymentReference: payRef || undefined,
      });
      await fetchRecords();
      setIsModalOpen(false);
      toast.success('Payment recorded successfully');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Fee Payments Management</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <ClassSectionSelect
            schoolCode={user?.schoolCode}
            valueClass={selectedClass}
            valueSection={selectedSection}
            onClassChange={setSelectedClass}
            onSectionChange={setSelectedSection}
          />

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search students..."
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Assigned</p>
                <p className="text-2xl font-semibold text-blue-900">
                  {formatCurrency(students.reduce((sum, s) => sum + (s.totalAmount || 0), 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-green-600">Total Collected</p>
                <p className="text-2xl font-semibold text-green-900">
                  {formatCurrency(students.reduce((sum, s) => sum + (s.totalPaid || 0), 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-orange-600">Outstanding</p>
                <p className="text-2xl font-semibold text-orange-900">
                  {formatCurrency(students.reduce((sum, s) => sum + (s.balance || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Student Fee Records</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Assigned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <button
                        type="button"
                        onClick={() => openHistoryModal(student)}
                        className="text-left text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Receipt size={14} />
                        {student.name}
                      </button>
                      {(student.class || student.section || student.rollNumber) && (
                        <div className="text-sm text-gray-500">
                          {[
                            student.class && student.section
                              ? `${student.class} - ${student.section}`
                              : (student.class || student.section || ''),
                            student.rollNumber ? `(${student.rollNumber})` : ''
                          ].filter(Boolean).join(' ')}
                        </div>
                      )}
                      {/* History Modal */}
                      {isHistoryOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
                            <div className="flex items-center justify-between px-4 py-3 border-b">
                              <h3 className="text-lg font-semibold text-gray-900">Payment History{historyRecord?.studentName ? ` - ${historyRecord.studentName}` : ''}</h3>
                              <button onClick={() => setIsHistoryOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <div className="p-4 space-y-3">
                              {historyLoading && <div className="text-sm text-gray-500">Loading history...</div>}
                              {!historyLoading && historyRecord && (
                                <>
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-700">Installment:</label>
                                    <select
                                      className="px-2 py-1 border rounded text-sm"
                                      value={historyInstallmentName}
                                      onChange={(e) => setHistoryInstallmentName(e.target.value)}
                                    >
                                      {(historyRecord.installments || []).map((inst: any) => (
                                        <option key={inst.name} value={inst.name}>{inst.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="overflow-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {(historyRecord.payments || [])
                                          .filter((p: any) => !historyInstallmentName || p.installmentName === historyInstallmentName)
                                          .map((p: any) => {
                                            const d = p.paymentDate ? new Date(p.paymentDate) : null;
                                            const dateStr = d ? d.toLocaleDateString() : '-';
                                            const dayStr = d ? d.toLocaleDateString('en-IN', { weekday: 'long' }) : '-';
                                            return (
                                              <tr key={String(p.paymentId)} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(p.amount || 0)}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{p.paymentMethod}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{p.paymentReference || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{dateStr}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{dayStr}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">
                                                  {p.receiptNumber ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleDownloadReceipt(p.receiptNumber)}
                                                      className="text-blue-600 hover:underline"
                                                    >
                                                      {p.receiptNumber}
                                                    </button>
                                                  ) : (
                                                    '-'
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        {(!historyRecord.payments || historyRecord.payments.length === 0) && (
                                          <tr>
                                            <td colSpan={6} className="px-3 py-3 text-sm text-gray-500">No payments found for this installment.</td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(student.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(student.totalPaid)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(student.balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(student.status)}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openPaymentModal(student)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Record Payment
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {isModalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment - {activeStudent.name}</h3>
              <button onClick={closePaymentModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Installment</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(activeStudent.installments || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-3 text-sm text-gray-500">No installments data available.</td>
                      </tr>
                    ) : (
                      activeStudent.installments.map((inst: any, idx: number) => {
                        const pending = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{inst.name}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(inst.amount || 0)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(inst.paidAmount || 0)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(pending)}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => onSelectInstallment(inst)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    {selectedInstallmentName
                      ? `Selected installment: ${selectedInstallmentName}`
                      : 'Select an installment from the table to proceed.'}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount to collect</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Select an installment first"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {['cheque', 'bank_transfer', 'online'].includes(payMethod) ? 'Reference / Remarks (required)' : 'Reference / Remarks (optional)'}
                    </label>
                    <input
                      type="text"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="txn id, cheque no, note, etc."
                      required={['cheque', 'bank_transfer', 'online'].includes(payMethod)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={closePaymentModal}
                      disabled={submitting}
                      className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitPayment}
                      disabled={submitting || !selectedInstallmentName}
                      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Recording...' : 'Record Payment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {loading && (
        <div className="text-sm text-gray-500">Loading records...</div>
      )}
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {/* Receipt Modal */}
      {isReceiptOpen && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Payment Receipt - {receiptData.studentData.name}
              </h3>
              <button 
                onClick={() => setIsReceiptOpen(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <DualCopyReceipt
                schoolData={receiptData.schoolData}
                studentData={receiptData.studentData}
                paymentData={receiptData.paymentData}
                installments={receiptData.installments}
                totalAmount={receiptData.totalAmount}
                totalPaid={receiptData.totalPaid}
                totalRemaining={receiptData.totalRemaining}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeePaymentsTab;
