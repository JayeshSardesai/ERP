// Environment Configuration
// Replace with your actual MongoDB Atlas connection details

export const ENV = {
  // MongoDB Atlas API Base URL (if using Atlas Data API)
  // Or your backend API URL
  API_BASE_URL: 'https://your-backend-api.com/api',
  
  // MongoDB Atlas Connection String (DO NOT expose this in production!)
  // This should be handled by your backend server
  MONGODB_URI: 'mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>?retryWrites=true&w=majority',
  
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

// Instructions for setting up MongoDB Atlas:
// 1. Go to https://cloud.mongodb.com/
// 2. Create a new cluster (free tier available)
// 3. Create a database user
// 4. Whitelist your IP address (or use 0.0.0.0/0 for testing)
// 5. Get your connection string from "Connect" > "Connect your application"
// 6. Replace the MONGODB_URI above with your connection string
// 7. Replace <username>, <password>, and <database> with your actual values

export default ENV;
