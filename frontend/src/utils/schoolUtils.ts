import { schoolAPI } from '../services/api';

// Default school details that will be used if API fails
const defaultSchoolDetails = {
  schoolName: 'KENDRIYA VIDYALAYA',
  schoolCode: 'KV',
  schoolLogo: '/school-logo.png', // Default logo path
  address: {
    addressLine1: 'School Address',
    city: 'City',
    state: 'State',
    pincode: 'Pincode'
  },
  contact: {
    phone: '+91 XXXXXXXXXX',
    email: 'info@school.edu.in'
  },
  bankDetails: {
    accountName: 'KENDRIYA VIDYALAYA',
    accountNumber: '12345678901234',
    bankName: 'School Bank',
    ifscCode: 'SBIN0001234',
    branch: 'Main Branch',
    accountType: 'Savings'  // Added account type which is commonly needed in challans
  }
};

/**
 * Fetches school details from the API or returns default values if the API fails
 * @param schoolId The ID of the school to fetch details for
 * @returns Promise that resolves to school details
 */
export const getSchoolDetails = async (schoolId: string) => {
  try {
    console.log(`[getSchoolDetails] Fetching school data for ID: ${schoolId}`);
    // Try to fetch from API
    const response = await schoolAPI.getSchoolById(schoolId);
    
    console.log('[getSchoolDetails] API Response:', response);
    
    // If we have a valid response with data, return it
    if (response?.data?.data) {
      const schoolData = {
        ...defaultSchoolDetails,  // Use defaults as fallback
        ...response.data.data,    // Override with API data
        bankDetails: {
          ...defaultSchoolDetails.bankDetails,
          ...(response.data.data.bankDetails || {})  // Merge bank details
        }
      };
      
      console.log('[getSchoolDetails] Processed school data:', schoolData);
      return schoolData;
    }
    
    console.warn('[getSchoolDetails] No data in API response, using defaults');
    return defaultSchoolDetails;
  } catch (error) {
    console.error('Error fetching school details, using defaults:', error);
    return defaultSchoolDetails;
  }
};

/**
 * Gets the school logo URL, with a fallback to default logo
 * @param schoolDetails School details object
 * @returns URL to the school logo
 */
export const getSchoolLogo = (schoolDetails: any) => {
  return schoolDetails?.schoolLogo || defaultSchoolDetails.schoolLogo;
};

/**
 * Gets formatted bank details for display in challans
 * @param schoolDetails School details object
 * @returns Formatted bank details string
 */
export const getFormattedBankDetails = (schoolDetails: any) => {
  const bank = schoolDetails?.bankDetails || defaultSchoolDetails.bankDetails;
  return `A/C Holder: ${bank.accountName}\n` +
         `A/C No: ${bank.accountNumber}\n` +
         `Bank: ${bank.bankName}\n` +
         `IFSC: ${bank.ifscCode}\n` +
         `Branch: ${bank.branch}`;
};

/**
 * Gets formatted school address
 * @param schoolDetails School details object
 * @returns Formatted address string
 */
export const getFormattedAddress = (schoolDetails: any) => {
  const addr = schoolDetails?.address || defaultSchoolDetails.address;
  return `${addr.addressLine1 || ''}\n` +
         `${addr.city || ''} ${addr.state || ''} - ${addr.pincode || ''}\n` +
         `Ph: ${schoolDetails?.contact?.phone || defaultSchoolDetails.contact.phone}`;
};
