// Environment Configuration
// Replace with your actual backend API URL

export const ENV = {
  // Backend API URL (adjust port if your backend runs on a different one)
  API_BASE_URL: 'http://localhost:5050/api',
  
  // MongoDB Atlas Connection String (handled by backend)
  MONGODB_URI: 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp',
  
  // API Endpoints
  ENDPOINTS: {
    LOGIN: '/auth/login',
    STUDENT_DATA: '/student',
    ATTENDANCE: '/attendance',
    RESULTS: '/results',
    ASSIGNMENTS: '/assignments',
    ACTIVITY: '/activity',
    ANNOUNCEMENTS: '/announcements',
  },
};

export default ENV;

