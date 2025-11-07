import axios, { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Debug base URL once at startup
// eslint-disable-next-line no-console
console.log('[API] Base URL:', ENV.API_BASE_URL);

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('authToken');
  const schoolCode = await AsyncStorage.getItem('schoolCode');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (schoolCode) {
    config.headers = config.headers || {};
    config.headers['x-school-code'] = schoolCode;
  }
  return config;
});

export default api;


