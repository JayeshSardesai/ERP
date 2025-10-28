import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage and redirect to login
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

// API Service Functions

export const authService = {
  // Login user
  login: async (credentials: { username: string; password: string; schoolCode: string; role: string }) => {
    try {
      const response = await apiClient.post(ENV.ENDPOINTS.LOGIN, credentials);
      const { token, user } = response.data;
      
      // Store token and user data
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  },

  // Logout user
  logout: async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
  },

  // Get current user
  getCurrentUser: async () => {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },
};

export const studentService = {
  // Get student profile
  getProfile: async (studentId: string) => {
    try {
      const response = await apiClient.get(`${ENV.ENDPOINTS.STUDENT_DATA}/${studentId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch profile' };
    }
  },

  // Get attendance data
  getAttendance: async (studentId: string, month?: string, year?: string) => {
    try {
      const params = { studentId, month, year };
      const response = await apiClient.get(ENV.ENDPOINTS.ATTENDANCE, { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch attendance' };
    }
  },

  // Get test results
  getResults: async (studentId: string) => {
    try {
      const response = await apiClient.get(`${ENV.ENDPOINTS.RESULTS}/${studentId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch results' };
    }
  },

  // Get assignments
  getAssignments: async (studentId: string, status?: string) => {
    try {
      const params = { studentId, status };
      const response = await apiClient.get(ENV.ENDPOINTS.ASSIGNMENTS, { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch assignments' };
    }
  },

  // Get activity feed
  getActivity: async (studentId: string, limit?: number) => {
    try {
      const params = { studentId, limit };
      const response = await apiClient.get(ENV.ENDPOINTS.ACTIVITY, { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch activity' };
    }
  },

  // Get announcements
  getAnnouncements: async (schoolCode: string) => {
    try {
      const response = await apiClient.get(`${ENV.ENDPOINTS.ANNOUNCEMENTS}?schoolCode=${schoolCode}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch announcements' };
    }
  },
};

// Example MongoDB Atlas Data API integration
// If you're using MongoDB Atlas Data API directly (not recommended for production)
export const mongoDBService = {
  // Find documents
  findDocuments: async (collection: string, filter: any) => {
    try {
      // This is an example - you'll need to set up MongoDB Atlas Data API
      // and configure the endpoint
      const response = await axios.post(
        'https://data.mongodb-api.com/app/<YOUR-APP-ID>/endpoint/data/v1/action/find',
        {
          collection,
          database: 'your-database',
          dataSource: 'your-cluster',
          filter,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': 'YOUR-API-KEY', // Never expose this in production!
          },
        }
      );
      return { success: true, data: response.data.documents };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

export default apiClient;
