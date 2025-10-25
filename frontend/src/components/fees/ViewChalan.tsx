import React, { useState, useCallback, ReactNode } from 'react';
import { FileText, Printer, X, Edit, Save } from 'lucide-react';

interface ViewChalanProps {
  isOpen: boolean;
  onClose: () => void;
  chalan: ChalanDetails;
}

// Utility functions
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  accountHolderName: string;
}

interface ChalanDetails {
  // Chalan Details
  chalanNumber: string;
  chalanDate: string;
  chalanStatus: 'pending' | 'generated' | 'paid';
  
  // Installment Details
  installmentName: string;
  amount: number;
  dueDate: string;
  
  // Student Details
  studentName: string;
  studentId: string;
  className: string;
  section: string;
  academicYear: string;
  
  // School Details
  schoolName: string;
  schoolAddress: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogo?: string;
  schoolCode?: string;
  
  // Bank Details
  bankDetails?: BankDetails;
  
  [key: string]: unknown; // Allow additional dynamic properties
}

interface ChalanCopyProps {
  chalan: ChalanDetails; 
  copyType: 'Student Copy' | 'Office Copy' | 'Admin Copy';
  isEditable: boolean;
  onChalanChange: (field: string, value: string) => void;
}

const ChalanCopy: React.FC<ChalanCopyProps> = ({ 
  chalan, 
  copyType, 
  isEditable, 
  onChalanChange 
}) => {
  // Debug: Log the chalan props
  React.useEffect(() => {
    console.log('Chalan props in ViewChalan:', {
      hasSchoolLogo: !!chalan?.schoolLogo,
      schoolLogo: chalan?.schoolLogo,
      schoolCode: chalan?.schoolCode,
      schoolName: chalan?.schoolName,
    });
  }, [chalan]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChalanChange(name, value);
  }, [onChalanChange]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Failed to load logo');
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
  }, []);

  return (
    <div className="border border-gray-300 p-4 mb-4">
      {/* School Header */}
      <div className="text-center mb-4 border-b pb-2">
        <div className="flex flex-col items-center mb-2">
          <div className="h-24 w-24 flex items-center justify-center bg-white rounded-full overflow-hidden border-2 border-gray-200">
            <img 
              src={
                // First try the school's custom logo if provided
                chalan.schoolLogo && chalan.schoolLogo !== '/school-logo-kv.png'
                  ? chalan.schoolLogo
                  // Then try the default logo based on school code
                  : chalan.schoolCode === 'KV' 
                    ? '/White green minimalist education knowledge logo copy.png'
                    : '/logo.png'
              }
              alt={`${chalan.schoolName || 'School'} Logo`}
              className="h-full w-full object-contain p-1"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.warn('Failed to load logo from:', target.src);
                
                // If we already tried the fallback, give up
                if (target.src.endsWith('logo.png') || target.src.includes('White green')) {
                  console.error('All logo loading attempts failed');
                  target.style.display = 'none';
                  return;
                }
                
                // Try the fallback logo
                console.log('Trying fallback logo');
                target.src = '/logo.png';
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {chalan.schoolCode === 'SK' ? 'SARASWATI KUNJ' : chalan.schoolName} ({chalan.schoolCode || 'N/A'})
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-red-500">
              Logo: {chalan.schoolLogo || 'Using default logo'}
            </div>
          )}
        </div>
        <h2 className="text-lg font-bold">{
          chalan.schoolCode === 'SK' ? 'SARASWATI KUNJ' : 
          chalan.schoolName || 'KENDRIYA VIDYALAYA'
        }</h2>
        <p className="text-xs">{chalan.schoolAddress || 'School Address, City, State - Pincode'}</p>
        {chalan.schoolPhone && <p className="text-xs">Phone: {chalan.schoolPhone}</p>}
        {chalan.schoolEmail && <p className="text-xs">Email: {chalan.schoolEmail}</p>}
        <p className="text-sm font-medium mt-1">FEE PAYMENT CHALAN</p>
        <p className="text-sm font-bold text-blue-600 mt-1">{copyType.toUpperCase()}</p>
      </div>
      
      {/* Bank Details Section */}
      <div className="mt-3 text-left border-t pt-2 text-xs">
        <div className="flex justify-between items-center mb-2 border-b pb-2">
          <p>Chalan: <span className="font-medium">{chalan.chalanNumber || 'N/A'}</span></p>
          <p>Date: <span className="font-medium">{chalan.chalanDate ? formatDate(chalan.chalanDate) : formatDate(new Date().toISOString())}</span></p>
        </div>
        <div>
          <p className="font-semibold mb-1">Bank Details:</p>
          <div className="space-y-1">
            <p>Bank Name: <span className="font-medium">
              {'State Bank of India'}
            </span></p>
            <p>Account Holder: <span className="font-medium">{
              chalan.schoolCode === 'SK' ? 'SARASWATI KUNJ' :
              (chalan.bankDetails?.accountHolderName as string) || 
              (chalan.accountHolderName as string) || 
              (chalan.accountHolder as string) ||
              (chalan.schoolName as string) ||
              'KENDRIYA VIDYALAYA' // Default fallback
            }</span></p>
            <p>A/c No: <span className="font-mono">{
              (chalan.bankDetails?.accountNumber as string) || 
              (chalan.accountNumber as string) || 
              (chalan.accountNo as string) ||
              '12345678901234' // Default fallback
            }</span></p>
            <p>IFSC Code: <span className="font-mono">{
              (chalan.bankDetails?.ifscCode as string) || 
              (chalan.ifscCode as string) || 
              (chalan.ifsc as string) ||
              'SBIN0001234' // Default fallback
            }</span></p>
            <p>Branch: <span className="font-medium">{
              (chalan.bankDetails?.branch as string) || 
              (chalan.branch as string) || 
              (chalan.branchName as string) ||
              'Main Branch' // Default fallback
            }</span></p>
          </div>
        </div>
      </div>
      
      <div className="mb-2">
        <p className="text-xs text-gray-500">Academic Year: {chalan.academicYear || '2024-25'}</p>
      </div>
      
      <div className="border border-gray-200 p-3 mb-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="font-medium">Student Name:</p>
            {isEditable ? (
              <input
                type="text"
                name="studentName"
                value={chalan.studentName}
                onChange={handleInputChange}
                className="w-full border-b border-dashed border-gray-300 focus:outline-none"
              />
            ) : (
              <p>{chalan.studentName}</p>
            )}
          </div>
          <div>
            <p className="font-medium">Class & Section:</p>
            {isEditable ? (
              <div className="flex space-x-2">
                <input
                  type="text"
                  name="className"
                  value={chalan.className}
                  onChange={handleInputChange}
                  placeholder="Class"
                  className="w-1/2 border-b border-dashed border-gray-300 focus:outline-none"
                />
                <input
                  type="text"
                  name="section"
                  value={chalan.section || ''}
                  onChange={handleInputChange}
                  placeholder="Section"
                  className="w-1/2 border-b border-dashed border-gray-300 focus:outline-none"
                />
              </div>
            ) : (
              <p>{chalan.className} - {chalan.section || 'N/A'}</p>
            )}
          </div>
          <div>
            <p className="font-medium">Student ID:</p>
            {isEditable ? (
              <input
                type="text"
                name="studentId"
                value={chalan.studentId || ''}
                onChange={handleInputChange}
                className="w-full border-b border-dashed border-gray-300 focus:outline-none"
              />
            ) : (
              <p className="font-mono">
                {chalan.studentId?.startsWith('KVS-') ? chalan.studentId : 
                 chalan.studentId?.match(/^[0-9a-fA-F]{24}$/) ? 'N/A' : 
                 chalan.studentId || 'N/A'}
              </p>
            )}
          </div>
          <div>
            <p className="font-medium">Installment:</p>
            <p>{chalan.installmentName}</p>
          </div>
          <div>
            <p className="font-medium">Amount:</p>
            <p>{formatCurrency(chalan.amount)}</p>
          </div>
          <div>
            <p className="font-medium">Due Date:</p>
            {isEditable ? (
              <input
                type="date"
                name="dueDate"
                value={chalan.dueDate}
                onChange={handleInputChange}
                className="w-full border-b border-dashed border-gray-300 focus:outline-none"
              />
            ) : (
              <p>{formatDate(chalan.dueDate)}</p>
            )}
          </div>
        </div>
        
        <div className="mt-4 pt-2">
          <div className="w-full h-16 border-t border-b border-gray-300">
            {/* Empty space */}
          </div>
        </div>
      </div>
    </div>
  );
};

const ViewChalan = ({ isOpen, onClose, chalan: initialChalan }: ViewChalanProps) => {
  const [isEditable, setIsEditable] = useState(false);
  const [chalan, setChalan] = useState<ChalanDetails | null>(() => {
    // Ensure we don't show MongoDB _id as student ID
    if (initialChalan && initialChalan.studentId && 
        initialChalan.studentId.match(/^[0-9a-fA-F]{24}$/) && 
        initialChalan['_id'] === initialChalan.studentId) {
      return { ...initialChalan, studentId: 'N/A' };
    }
    return initialChalan;
  });
  
  if (!isOpen || !chalan) return null;

  const handlePrint = () => {
    // Switch to non-editable mode before printing
    const wasEditable = isEditable;
    if (wasEditable) setIsEditable(false);
    
    // Small delay to allow the UI to update before printing
    setTimeout(() => {
      window.print();
      // Restore edit mode if it was enabled
      if (wasEditable) {
        setTimeout(() => setIsEditable(true), 500);
      }
    }, 100);
  };

  const handleChalanChange = (field: string, value: string) => {
    if (!chalan) return;
    setChalan({
      ...chalan,
      [field]: value
    });
  };

  const handleSave = () => {
    // Here you would typically save the changes to your backend
    console.log('Saving chalan changes:', chalan);
    // For now, just toggle edit mode off
    setIsEditable(false);
  };

  // Create three copies of the chalan with different types
  const chalanCopies = [
    { type: 'Student Copy' as const, bgColor: 'bg-blue-50' },
    { type: 'Office Copy' as const, bgColor: 'bg-green-50' },
    { type: 'Admin Copy' as const, bgColor: 'bg-purple-50' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-800">Chalan Details</h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-blue-600"
              title="Print"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Chalan Content */}
        <div className="p-6 print:p-0">
          {/* Print-specific styles */}
          <style>{`
            @page {
              size: A4 landscape;
              margin: 0;
            }
            @media print {
              body * {
                visibility: hidden;
              }
              #chalan-print, #chalan-print * {
                visibility: visible;
              }
              #chalan-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 0;
                margin: 0;
              }
              .chalan-copy {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
          
          <div id="chalan-print" className="space-y-6">
            {/* Removed duplicate school header from top of A4 page */}
            
            
            {/* Chalan Copies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2 print:px-4 print:py-2">
              {chalanCopies.map((copy, index) => (
                <div key={index} className={`chalan-copy ${copy.bgColor} print:bg-transparent print:border`}>
                  <ChalanCopy 
                    chalan={chalan} 
                    copyType={copy.type} 
                    isEditable={isEditable && !document.hidden}
                    onChalanChange={handleChalanChange}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Student Info */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Student Name</p>
                <p className="font-medium">{chalan.studentName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Class</p>
                <p className="font-medium">{chalan.className}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date: <span className="font-medium">{chalan.chalanDate ? formatDate(chalan.chalanDate) : ''}</span></p>
              </div>
            </div>
          </div>

          {/* Fee Details */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2">{chalan.installmentName} - {formatDate(chalan.dueDate)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(chalan.amount)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-semibold">Total Amount</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(chalan.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bank Details */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-700 mb-3">
                  Please deposit the fee in the following bank account and keep this chalan for future reference.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Account Name:</p>
                    <p className="text-sm font-medium text-gray-900">
                      {chalan.bankDetails?.accountHolderName || 
                       chalan.accountHolderName || 
                       chalan.schoolName || 
                       'SARASWATI KUNJ'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Account Number:</p>
                    <p className="text-sm font-mono text-gray-900">
                      {chalan.bankDetails?.accountNumber || 
                       chalan.accountNumber || 
                       '1234567890'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Bank Name:</p>
                    <p className="text-sm text-gray-900">
                      {chalan.bankDetails?.bankName || 
                       chalan.bankName || 
                       'State Bank of India'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">IFSC Code:</p>
                    <p className="text-sm font-mono text-gray-900">
                      {chalan.bankDetails?.ifscCode || 
                       chalan.ifscCode || 
                       'SBIN0001234'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Branch:</p>
                    <p className="text-sm text-gray-900">
                      {chalan.bankDetails?.branch || 
                       chalan.branch || 
                       'Main Branch'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>This is a computer-generated chalan. No signature is required.</p>
            <p className="mt-1">For any queries, please contact the school office.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 border-t border-gray-200 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Chalan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewChalan;
