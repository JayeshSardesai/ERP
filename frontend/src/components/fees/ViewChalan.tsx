import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { FileText, Printer, X, Edit, Save } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import api, { feesAPI } from '../../services/api';

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

interface Address {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  [key: string]: any; // Allow additional dynamic properties
}

interface SchoolData {
  _id?: string;
  name?: string;
  schoolName?: string;
  code?: string;
  schoolCode?: string;
  logo?: string;
  logoUrl?: string;
  address?: string | Address;
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
    [key: string]: any;
  };
  [key: string]: any; // Allow additional dynamic properties
}

interface ChalanDetails {
  // Chalan Details
  chalanNumber: string;
  chalanDate: string;
  chalanStatus: 'pending' | 'generated' | 'paid' | 'unpaid' | 'cancelled';
  
  // Installment Details
  installmentName: string;
  amount: number;
  dueDate: string;
  
  // Student Details
  studentName: string;
  studentId: string;
  userId?: string; // User-friendly ID (e.g., 123-S-0006)
  admissionNumber?: string; // Alternative ID field
  rollNumber?: string | null; // Another possible ID field
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
  schoolData?: SchoolData; // Add schoolData to store complete school information
  
  // Bank Details
  bankDetails?: BankDetails;
  
  // Backend fields
  _id?: string;
  status?: 'unpaid' | 'paid' | 'cancelled';
  
  [key: string]: unknown; // Allow additional dynamic properties
}

// Helper function to format chalan number if it's not in the expected format
const useChalanNumber = (chalan: ChalanDetails) => {
  const [chalanNumber, setChalanNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const generateChalanNumber = useCallback(() => {
    // Generate a simple chalan number with timestamp and random number
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 1000);
    return `CHL-${timestamp}-${randomNum}`;
  }, []);

  useEffect(() => {
    const fetchChalanNumber = async () => {
      // If we have a valid chalan number from the backend, use it as is
      if (chalan.chalanNumber && chalan.chalanNumber.trim() !== '') {
        setChalanNumber(chalan.chalanNumber.trim().toUpperCase());
        return;
      }
      
      setIsLoading(true);
      try {
        // Get the next chalan number from the server
        const response = await feesAPI.getNextChalanNumber();
        if (response && response.success && response.chalanNumber) {
          setChalanNumber(response.chalanNumber);
          return;
        }
        
        // Fallback to local counter if API call fails
        const localChalanNumber = generateChalanNumber();
        setChalanNumber(localChalanNumber);
      } catch (error) {
        console.error('Error fetching chalan number:', error);
        // Fallback to local counter on error
        const localChalanNumber = generateChalanNumber();
        setChalanNumber(localChalanNumber);
      } finally {
        setIsLoading(false);
      }
    };

    if (chalan.chalanNumber) {
      setChalanNumber(chalan.chalanNumber);
    } else {
      fetchChalanNumber();
    }
  }, [chalan.chalanNumber]);

  return { chalanNumber, isLoading };
};

interface ChalanCopyProps {
  chalan: ChalanDetails; 
  copyType: 'Student Copy' | 'Office Copy' | 'Admin Copy';
}

const ChalanCopy: React.FC<ChalanCopyProps> = ({ 
  chalan: propChalan, 
  copyType
}) => {
  // Use the useChalanNumber hook to get the chalan number
  const { chalanNumber, isLoading } = useChalanNumber(propChalan);
  
  // Create a local copy of chalan with the updated chalan number
  const chalan = {
    ...propChalan,
    chalanNumber: chalanNumber || propChalan.chalanNumber
  };

  // Debug: Log the chalan props
  React.useEffect(() => {
    console.log('Chalan props in ViewChalan:', {
      hasSchoolLogo: !!chalan?.schoolLogo,
      schoolLogo: chalan?.schoolLogo,
      schoolCode: chalan?.schoolCode,
      schoolName: chalan?.schoolName,
      chalanNumber: chalan?.chalanNumber
    });
  }, [chalan]);


  // Format logo URL consistently with UniversalTemplate
  const getLogoUrl = useCallback((logoPath?: string): string => {
    if (!logoPath) return '';
    
    // If it's already a full URL, return as is
    if (logoPath.startsWith('http')) {
      return logoPath;
    }
    
    // If it's a path starting with /uploads, prepend the API base URL
    if (logoPath.startsWith('/uploads')) {
      const envBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5050/api';
      const baseUrl = envBase.replace(/\/api\/?$/, '');
      return `${baseUrl}${logoPath}`;
    }
    
    // For other cases, return as is (handles relative paths like '/logo.png')
    return logoPath;
  }, []);

  // Get the logo URL with proper fallback logic
  const getChalanLogoUrl = useCallback(() => {
    // First try schoolLogo from chalan
    if (chalan?.schoolLogo) {
      return getLogoUrl(chalan.schoolLogo);
    }
    
    // Then try schoolData.logo or schoolData.logoUrl
    const logoFromSchoolData = chalan?.schoolData?.logo || chalan?.schoolData?.logoUrl;
    if (logoFromSchoolData) {
      return getLogoUrl(logoFromSchoolData);
    }
    
    // Fallback to school logo from env or default
    const defaultLogo = import.meta.env.VITE_DEFAULT_SCHOOL_LOGO || 
                       '/default-school-logo.svg';
    return getLogoUrl(defaultLogo);
  }, [chalan?.schoolLogo, chalan?.schoolData, getLogoUrl]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    
    // Get the default logo URL from environment or use a default path
    const defaultLogo = import.meta.env.VITE_DEFAULT_SCHOOL_LOGO || '/default-school-logo.svg';
    const defaultLogoUrl = getLogoUrl(defaultLogo);
    
    // Only try to fallback if we're not already trying to load the default logo
    if (target.src !== defaultLogoUrl) {
      target.src = defaultLogoUrl;
    } else {
      // If default logo also fails, hide the image
      console.error('All logo loading attempts failed');
      target.style.display = 'none';
    }
  }, []);

  return (
    <div className="w-[90%] max-w-md mx-auto border border-gray-300 p-4 mb-4">
      {/* School Header with Logo and Details */}
      <div className="mb-4 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-4">
          {/* School Logo */}
          <div className="flex-shrink-0">
            <div className="h-16 w-16 flex items-center justify-center border border-gray-200 rounded overflow-hidden">
              <img 
                src={getChalanLogoUrl()}
                alt={`${chalan.schoolName || 'School'} Logo`}
                className="w-full h-full object-contain p-1"
                onError={handleImageError}
              />
            </div>
          </div>
          
          {/* School Details */}
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {chalan.schoolName || 'School Name'}
            </h1>
            <p className="text-sm text-gray-600">
              {formatAddress(chalan.schoolAddress || chalan.schoolData?.address) || 'Address not available'}
            </p>
          </div>
        </div>
        
        {/* Title and copy type centered below */}
        <div className="text-center mt-3">
          <p className="text-sm font-bold uppercase tracking-wide">FEE PAYMENT CHALAN</p>
          <p className="text-xs text-gray-600 mt-1">Academic Year: 2024-25</p>
          <p className="text-xs font-semibold text-blue-600 mt-1">{copyType.toUpperCase()}</p>
        </div>
      </div>
      
      {/* Chalan and Date Section */}
      <div className="mt-2 px-4 text-xs">
        <div className="flex justify-between items-center py-1">
          <p className="text-xs">Chalan: <span className="font-mono font-medium">
            {isLoading ? 'Loading...' : chalan.chalanNumber || 'N/A'}
          </span></p>
          <p className="text-xs">Date: <span className="font-medium">
            {chalan.chalanDate ? formatDate(chalan.chalanDate) : formatDate(new Date().toISOString())}
          </span></p>
        </div>
      </div>
      
      {/* Horizontal Line */}
      <div className="border-t border-gray-200 my-2"></div>
      
      {/* Student Details Section */}
      <div className="mt-2 px-4 text-xs">
        <div className="mb-2">
          <p className="text-xs font-medium">Student Details</p>
        </div>
        <div>
          <div className="space-y-1">
            {/* Student Name */}
            <div className="flex items-center mb-1">
              <span className="w-28 text-xs text-gray-600 font-medium">Name:</span>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-800">{chalan.studentName || 'N/A'}</span>
              </div>
            </div>
            
            {/* Student ID */}
            <div className="flex items-center mb-1">
              <span className="w-28 text-xs text-gray-600 font-medium">Student ID:</span>
              <div className="flex-1">
                <span className="text-sm font-mono text-gray-800">
                  {chalan.userId || 
                   chalan.admissionNumber ||
                   (chalan.studentId?.startsWith('KVS-') ? chalan.studentId : 
                    chalan.studentId?.match(/^[0-9a-fA-F]{24}$/) ? 'N/A' : 
                    chalan.studentId || 'N/A')}
                </span>
              </div>
            </div>
            
            {/* Class & Section */}
            <div className="flex items-center">
              <span className="w-28 text-xs text-gray-600 font-medium">Class & Sec:</span>
              <div className="flex-1">
                <span className="text-sm text-gray-800">
                  {chalan.className || 'N/A'} {chalan.section ? `- ${chalan.section}` : ''}
                </span>
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-gray-100 my-2"></div>
          
          {/* Payment Info */}
          <div className="mt-4">
            <p className="font-semibold mb-2 text-sm">Payment Details:</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center">
                <span className="w-28 text-xs text-gray-600 font-medium">Installment:</span>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">{chalan.installmentName || 'N/A'}</span>
                </div>
              </div>
              
              <div className="flex items-center">
                <span className="w-28 text-xs text-gray-600 font-medium">Amount:</span>
                <span className="text-sm font-bold text-blue-700">{formatCurrency(chalan.amount)}</span>
              </div>
              
              <div className="flex items-center">
                <span className="w-28 text-xs text-gray-600 font-medium">Due Date:</span>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">{formatDate(chalan.dueDate) || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* School Bank Details Section */}
        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="font-semibold mb-2 text-left text-xs">School Bank Details:</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">Bank Name:</p>
              <p className="text-sm text-gray-900">
                {chalan.schoolData?.bankDetails?.bankName || 
                 chalan.bankDetails?.bankName || 
                 'SBI'}
              </p>
            </div>
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">Account Holder:</p>
              <p className="text-sm font-medium text-gray-800">
                {chalan.schoolData?.bankDetails?.accountHolderName || 
                 chalan.bankDetails?.accountHolderName ||
                 chalan.schoolData?.bankDetails?.accountName ||
                 chalan.bankDetails?.accountName ||
                 'SONU'}
              </p>
            </div>
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">A/c No:</p>
              <p className="text-sm font-mono text-gray-900">
                {chalan.schoolData?.bankDetails?.accountNumber || 
                 chalan.bankDetails?.accountNumber || 
                 '1586324862485631'}
              </p>
            </div>
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">IFSC Code:</p>
              <p className="text-sm font-mono text-gray-900">
                {chalan.schoolData?.bankDetails?.ifscCode || 
                 chalan.bankDetails?.ifscCode || 
                 'SBIN0569842'}
              </p>
            </div>
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">Branch:</p>
              <p className="text-sm text-gray-900">
                {chalan.schoolData?.bankDetails?.branch || 
                 chalan.bankDetails?.branch || 
                 'UGAR'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="w-full h-12 border-t border-b border-gray-300 flex items-center px-4">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">PAYMENT STATUS</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Function to format address from object or string
const formatAddress = (address: string | Address | undefined): string => {
  if (!address) return 'School Address, City, State - Pincode';
  
  if (typeof address === 'string') return address;
  
  // Handle nested address object structure from API
  if (typeof address === 'object') {
    const {
      street = '',
      area = '',
      city = '',
      state = '',
      country = '',
      pinCode = '',
      district = ''
    } = address;

    const parts = [
      street,
      area,
      city,
      state,
      country,
      pinCode || ''
    ].filter(Boolean);

    return parts.join(', ');
  }

  // Fallback for other cases
  return String(address);
};

const ViewChalan: React.FC<ViewChalanProps> = ({ isOpen, onClose, chalan: initialChalan, onSave }) => {
  const { user } = useAuth();
  const [chalan, setChalan] = useState<ChalanDetails>(() => ({
    chalanNumber: '',
    chalanDate: '',
    chalanStatus: 'generated',
    installmentName: '',
    amount: 0,
    dueDate: '',
    studentName: '',
    studentId: '',
    className: '',
    section: '',
    academicYear: '',
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    schoolLogo: '',
    schoolData: {},
    bankDetails: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      accountHolderName: ''
    }
  }));

  // Log when initialChalan changes
  useEffect(() => {
    if (initialChalan) {
      console.group('ViewChalan - Initial Chalan Data');
      console.log('Received chalan data:', {
        chalanNumber: initialChalan.chalanNumber,
        studentName: initialChalan.studentName,
        studentId: initialChalan.studentId,
        amount: initialChalan.amount,
        status: initialChalan.status || initialChalan.chalanStatus,
        _id: initialChalan._id
      });
      console.log('Full chalan object:', JSON.parse(JSON.stringify(initialChalan)));
      console.groupEnd();
    }
  }, [initialChalan]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chalanNumber, setChalanNumber] = useState('');
  
  // Debug: Log the entire chalan data when it changes
  useEffect(() => {
    console.log('Chalan data updated:', {
      hasUserId: !!chalan.userId,
      hasStudentId: !!chalan.studentId,
      rawChalan: chalan
    });
  }, [chalan]);
  
  // Debug: Log chalan data on initial render
  useEffect(() => {
    console.log('Chalan data:', {
      userId: initialChalan.userId,
      studentId: initialChalan.studentId,
      rawChalan: initialChalan
    });
  }, [initialChalan]);

  // Get the best available student ID for display
  useEffect(() => {
    console.log('=== DEBUG: Starting student ID resolution ===');
    console.log('Initial chalan data:', {
      userId: chalan.userId,
      studentId: chalan.studentId,
      rawChalan: JSON.parse(JSON.stringify(chalan)) // Deep clone to avoid reference issues
    });

    // If we have a userId (which is actually the student ID), use it directly
    if (chalan.userId) {
      console.log('Using userId directly from chalan data:', chalan.userId);
      return;
    }

    const fetchStudentData = async () => {
      // Skip if studentId is not available or is 'N/A'
      if (!chalan.studentId || chalan.studentId === 'N/A') {
        console.warn('No valid student ID available');
        return;
      }

      try {
        console.log(`Attempting to fetch student data for studentId: ${chalan.studentId}`);
        
        // First try to get student data using studentId
        const response = await api.get(`/students/${chalan.studentId}`);
        console.log('Student API response:', response.data);
        
        const studentData = response.data?.data || response.data;
        console.log('Processed student data:', studentData);
        
        // First priority: Check for userId in student data
        if (studentData?.userId) {
          console.log('Using userId from student data:', studentData.userId);
          return;
        }
        
        // If no userId in student data, try to get it from the user record
        if (studentData?.user?._id) {
          console.log('Fetching user record for ID:', studentData.user._id);
          const userRes = await api.get(`/users/${studentData.user._id}`);
          if (userRes.data?.data?.userId) {
            console.log('Found userId in user record:', userRes.data.data.userId);
            return;
          }
        }
        
        // Third priority: Check for user object with _id or id
        if (studentData?.user) {
          const userId = studentData.user._id || studentData.user.id;
          console.log('Using ID from user object:', userId);
          if (userId) {
            return;
          }
        }
        
        // Fourth priority: Check for studentId in the student data (not the one from chalan)
        if (studentData?.studentId) {
          console.log('Using studentId from student data:', studentData.studentId);
          return;
        }
        
        // Fifth priority: Use the _id from student data
        if (studentData?._id) {
          console.log('Using _id from student data as fallback:', studentData._id);
          return;
        }
        
        // If all else fails, use the original studentId from chalan as fallback
        console.warn('No suitable ID found in student data, using studentId as fallback:', chalan.studentId);
        
      } catch (error: any) {
        console.error('Error in fetchStudentData:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        // Use whatever ID we have as fallback
        const fallbackId = chalan.userId || chalan.studentId;
        console.warn('Using fallback ID:', fallbackId || 'N/A');
      }
    };

    // First check if we have a userId in the chalan data (preferred)
    if (chalan.userId) {
      console.log('Using userId directly from chalan data:', chalan.userId);
    } else if (chalan.studentId) {
      console.log('No userId found, will try to fetch using studentId:', chalan.studentId);
      fetchStudentData();
    } else if (chalan.userId) {
      // If we have a userId but no studentId, use it directly
      console.log('Using provided userId:', chalan.userId);
    } else {
      console.warn('No student ID or user ID found in chalan data');
    }
  }, [chalan.studentId, chalan.userId]);

  const [loading, setLoading] = useState(true);
  
  // Fetch school data when component mounts or initialChalan changes
  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!initialChalan) return;
      
      try {
        setLoading(true);
        let updatedChalan = { ...initialChalan };
        
        // Fetch school data from the same API as UniversalTemplate
        const schoolIdentifier = user?.schoolId || user?.schoolCode;
        if (schoolIdentifier) {
          const response = await api.get(`/schools/${schoolIdentifier}/info`);
          const schoolData = response?.data?.data || response?.data;
          
          if (schoolData) {
            // Format the logo URL
            let logoUrl = '';
            if (schoolData.logoUrl || schoolData.logo) {
              const rawLogoUrl = schoolData.logoUrl || schoolData.logo;
              if (rawLogoUrl.startsWith('/uploads')) {
                const envBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5050/api';
                const baseUrl = envBase.replace(/\/api\/?$/, '');
                logoUrl = `${baseUrl}${rawLogoUrl}`;
              } else {
                logoUrl = rawLogoUrl;
              }
              
              console.log('School logo URL:', {
                rawLogoUrl,
                finalLogoUrl: logoUrl,
                apiBase: import.meta.env.VITE_API_BASE_URL,
                schoolData
              });
            }
            
            // Update chalan with school data
            updatedChalan = {
              ...updatedChalan,
              schoolName: schoolData.name || schoolData.schoolName || updatedChalan.schoolName || 'School Name',
              schoolCode: schoolData.code || schoolData.schoolCode || updatedChalan.schoolCode || 'SCH001',
              schoolAddress: formatAddress(schoolData.address) || updatedChalan.schoolAddress,
              schoolEmail: schoolData.contact?.email || schoolData.email || updatedChalan.schoolEmail,
              schoolPhone: schoolData.contact?.phone || schoolData.phone || updatedChalan.schoolPhone,
              schoolLogo: logoUrl || updatedChalan.schoolLogo,
              schoolData // Store the complete school data for reference
            };
          }
        }
        
        // Ensure we don't show MongoDB _id as student ID
        if (updatedChalan.studentId && 
            updatedChalan.studentId.match(/^[0-9a-fA-F]{24}$/) && 
            (updatedChalan as any)._id === updatedChalan.studentId) {
          updatedChalan.studentId = 'N/A';
        }
        
        setChalan(updatedChalan);
      } catch (error) {
        console.error('Error fetching school data:', error);
        // If there's an error, use the initial chalan data
        setChalan(initialChalan);
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      fetchSchoolData();
    }
  }, [isOpen, initialChalan, user]);
  
  if (!isOpen || !chalan || loading) return null;

  const handleSave = async () => {
    if (!chalan) return;
    
    setIsLoading(true);
    try {
      // Check if this is a new chalan or an update
      if (initialChalan._id) {
        // Update existing chalan
        const updatedChalan = await chalanAPI.updateChalan(initialChalan._id, {
          ...chalan,
          chalanNumber: chalanNumber || chalan.chalanNumber
        });
        onSave?.(updatedChalan);
      } else {
        // Create new chalan using v2 API
        const newChalan = await chalanAPI.generateChalansV2({
          studentIds: [chalan.studentId],
          amount: chalan.amount,
          dueDate: chalan.dueDate,
          installmentName: chalan.installmentName,
          class: chalan.className,
          section: chalan.section,
          academicYear: chalan.academicYear,
          chalanNumber: chalanNumber
        });
        onSave?.(newChalan);
      }
      onClose();
    } catch (err) {
      setError('Failed to save chalan');
      console.error('Error saving chalan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    // Get the current date in a nice format
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Get the due date in a nice format
    const dueDate = chalan?.dueDate 
      ? new Date(chalan.dueDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      : 'N/A';

    // Get school details with fallbacks
    const schoolName = chalan?.schoolData?.name || chalan?.schoolName || 'School';
    const schoolAddress = formatAddress(chalan?.schoolData?.address || chalan?.schoolAddress || '');
    const schoolPhone = chalan?.schoolData?.phone || chalan?.schoolData?.contact?.phone || chalan?.schoolPhone || '';
    const schoolEmail = chalan?.schoolData?.email || chalan?.schoolData?.contact?.email || chalan?.schoolEmail || '';
    
    // Get the logo URL using the same logic as in the component
    const getLogoUrl = (logoPath?: string): string => {
      if (!logoPath) return '';
      if (logoPath.startsWith('http')) return logoPath;
      if (logoPath.startsWith('/uploads')) {
        const envBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5050/api';
        const baseUrl = envBase.replace(/\/api\/?$/, '');
        return `${baseUrl}${logoPath}`;
      }
      return logoPath;
    };

    const logoUrl = chalan?.schoolLogo || 
                   chalan?.schoolData?.logo || 
                   chalan?.schoolData?.logoUrl || 
                   '/default-school-logo.svg';
    
    const fullLogoUrl = getLogoUrl(logoUrl);

    // Create the print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${schoolName} - Chalan ${chalan.chalanNumber || ''}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            color: #333;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ddd;
            padding: 20px;
            position: relative;
          }
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
          }
          .school-logo {
            height: 80px;
            width: 80px;
            object-fit: contain;
            margin-right: 20px;
            border: 1px solid #eee;
            padding: 5px;
            border-radius: 4px;
          }
          .school-info {
            flex: 1;
          }
          .school-name {
            margin: 0;
            font-size: 20px;
            font-weight: bold;
            color: #1a365d;
          }
          .school-address {
            margin: 5px 0;
            font-size: 14px;
            color: #4a5568;
          }
          .school-contact {
            font-size: 13px;
            color: #718096;
            margin: 2px 0;
          }
          .chalan-title {
            text-align: center;
            margin: 20px 0;
            padding: 10px;
            background-color: #f7fafc;
            border-radius: 4px;
          }
          .chalan-title h2 {
            margin: 0;
            color: #2d3748;
            font-size: 22px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .chalan-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 14px;
          }
          .chalan-number, .chalan-date {
            background-color: #f0f4f8;
            padding: 5px 15px;
            border-radius: 4px;
            font-weight: 500;
          }
          .details-container {
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .detail-label {
            font-weight: 600;
            width: 150px;
            color: #4a5568;
          }
          .detail-value {
            flex: 1;
            color: #2d3748;
          }
          .amount-section {
            margin: 25px 0;
            text-align: right;
          }
          .amount {
            font-size: 18px;
            font-weight: bold;
            color: #2b6cb0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            text-align: right;
          }
          .signature {
            margin-top: 40px;
            text-align: right;
          }
          .signature-line {
            display: inline-block;
            width: 200px;
            border-top: 1px solid #333;
            margin-top: 50px;
          }
          .signature-label {
            margin-top: 5px;
            font-size: 14px;
            color: #4a5568;
          }
          @media print {
            body { 
              padding: 0;
              background: white;
            }
            .print-container {
              border: none;
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <!-- School Header -->
          <div class="header">
            ${fullLogoUrl ? 
              `<img src="${fullLogoUrl}" alt="${schoolName} Logo" class="school-logo" 
                onerror="this.onerror=null; this.style.display='none';">` : ''
            }
            <div class="school-info">
              <h1 class="school-name">${schoolName}</h1>
              <div class="school-address">${schoolAddress}</div>
              ${schoolPhone ? `<div class="school-contact">Phone: ${schoolPhone}</div>` : ''}
              ${schoolEmail ? `<div class="school-contact">Email: ${schoolEmail}</div>` : ''}
            </div>
          </div>

          <!-- Chalan Title -->
          <div class="chalan-title">
            <h2>FEE PAYMENT CHALAN</h2>
          </div>

          <!-- Chalan Meta -->
          <div class="chalan-meta">
            <div class="chalan-number">Chalan #: ${chalan.chalanNumber || 'N/A'}</div>
            <div class="chalan-date">Date: ${currentDate}</div>
          </div>

          <!-- Student Details -->
          <div class="details-container">
            <div class="detail-row">
              <div class="detail-label">Student Name:</div>
              <div class="detail-value">${chalan.studentName || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Class & Section:</div>
              <div class="detail-value">${chalan.className || 'N/A'} / ${chalan.section || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Academic Year:</div>
              <div class="detail-value">${chalan.academicYear || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Installment:</div>
              <div class="detail-value">${chalan.installmentName || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Due Date:</div>
              <div class="detail-value">${dueDate}</div>
            </div>
          </div>

          <!-- Amount Section -->
          <div class="amount-section">
            <div>Total Amount Payable:</div>
            <div class="amount">₹${chalan.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</div>
          </div>

          <!-- Signature -->
          <div class="signature">
            <div class="signature-line"></div>
            <div class="signature-label">Authorized Signature</div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div>${schoolName} - ${schoolAddress}</div>
            ${schoolPhone ? `<div>Contact: ${schoolPhone}${schoolEmail ? ` | ${schoolEmail}` : ''}</div>` : ''}
          </div>

          <!-- Print Controls -->
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="
              background-color: #4299e1;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              margin-right: 10px;
            ">
              Print Chalan
            </button>
            <button onclick="window.close()" style="
              background-color: #e53e3e;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            ">
              Close
            </button>
          </div>
        </div>

        <script>
          // Auto-print when loaded
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Close the window after printing (with a delay)
              setTimeout(function() {
                window.close();
              }, 500);
            }, 500);
          };

          // Handle print dialog close/cancel
          window.onafterprint = function() {
            setTimeout(function() {
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      // Fallback to default print if popup is blocked
      const printContentElement = document.createElement('div');
      printContentElement.innerHTML = printContent;
      document.body.appendChild(printContentElement);
      window.print();
      document.body.removeChild(printContentElement);
    }
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
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Student Info */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-1 text-xs">
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

          {/* School Bank Details */}
          <div className="mt-4 border-t border-gray-200 pt-3">
            <p className="font-semibold mb-3 text-left text-sm">Payment Instructions</p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 mb-3">
                    Please deposit the fee in the following bank account and keep this chalan for future reference.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">Account Name:</p>
                <p className="text-sm font-medium text-gray-800">
                  {chalan.schoolData?.bankDetails?.accountHolderName || 
                   chalan.bankDetails?.accountHolderName ||
                   chalan.schoolData?.bankDetails?.accountName ||
                   chalan.bankDetails?.accountName ||
                   'School Account'}
                </p>
              </div>
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">Account No:</p>
                <p className="text-sm font-mono text-gray-900">
                  {chalan.schoolData?.bankDetails?.accountNumber || 
                   chalan.bankDetails?.accountNumber || 
                   'XXXXXXXXXXXX'}
                </p>
              </div>
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">Bank Name:</p>
                <p className="text-sm text-gray-900">
                  {chalan.schoolData?.bankDetails?.bankName || 
                   chalan.bankDetails?.bankName || 
                   'Bank Name'}
                </p>
              </div>
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">IFSC Code:</p>
                <p className="text-sm font-mono text-gray-900">
                  {chalan.schoolData?.bankDetails?.ifscCode || 
                   chalan.bankDetails?.ifscCode || 
                   'XXXX0000000'}
                </p>
              </div>
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">Branch:</p>
                <p className="text-sm text-gray-900">
                  {chalan.schoolData?.bankDetails?.branch || 
                   chalan.bankDetails?.branch || 
                   'Branch Name'}
                </p>
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
