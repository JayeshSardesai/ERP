import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  const schoolCode = await AsyncStorage.getItem('schoolCode');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  if (schoolCode) {
    config.headers = config.headers || {};
    (config.headers as any)['x-school-code'] = schoolCode;
  }
  return config;
});

export default api;


