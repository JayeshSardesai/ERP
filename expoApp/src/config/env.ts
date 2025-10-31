// Environment Configuration
// IMPORTANT: When running the app, replace the API_BASE_URL with your actual backend URL
// For local development on same machine: http://localhost:5050/api
// For mobile device testing: http://<YOUR_IP_ADDRESS>:5050/api (e.g., http://192.168.1.100:5050/api)
// For Replit deployment: Use your Replit backend URL

export const ENV = {
  // Backend API URL - CHANGE THIS BASED ON YOUR ENVIRONMENT
  // Local development: http://localhost:5050/api
  // Mobile testing: http://<YOUR_COMPUTER_IP>:5050/api
  // Production: https://<your-backend-url>/api
  API_BASE_URL: 'http://10.0.2.2:5050/api', // Using 10.0.2.2 for Android emulator to access host machine
  
  // API Endpoints (used by the student service)
  ENDPOINTS: {
    LOGIN: '/auth/school-login',
    STUDENT_ASSIGNMENTS: '/assignments',
    STUDENT_ATTENDANCE: '/attendance/student-report',
    STUDENT_RESULTS: '/results/student',
    MESSAGES: '/messages',
  },
};

export default ENV;

