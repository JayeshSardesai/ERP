import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include token if available
api.interceptors.request.use((config) => {
  let token;
  let schoolCode;
  
  // Try to get auth data from localStorage
  const auth = localStorage.getItem('erp.auth');
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      token = parsed.token;
      schoolCode = parsed.user?.schoolCode;
    } catch (error) {
      console.error('Error parsing auth data:', error);
    }
  }
  
  // Fallback to direct token storage
  if (!token) {
    token = localStorage.getItem('token');
  }
  
  // Set authorization header if token is available
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Set school code header if available
  if (schoolCode) {
    config.headers['X-School-Code'] = schoolCode;
  }
  
  return config;
});

export default api;
