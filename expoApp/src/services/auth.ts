import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export type Role = 'student' | 'teacher' | 'admin' | 'superadmin';

export async function loginSchool(params: { identifier: string; password: string; schoolCode: string }): Promise<{ success: boolean; message?: string }> {
  try {
    const { data } = await api.post('/auth/school-login', {
      identifier: params.identifier,
      password: params.password,
      schoolCode: params.schoolCode,
    });

    if (!data?.success || !data?.token || !data?.user) {
      return { success: false, message: data?.message || 'Login failed' };
    }

    await AsyncStorage.multiSet([
      ['authToken', data.token],
      ['userData', JSON.stringify(data.user)],
      ['schoolCode', params.schoolCode],
      ['role', (data.user.role || '').toString().toLowerCase()],
    ]);

    return { success: true };
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Login failed';
    return { success: false, message };
  }
}

export async function loginGlobal(params: { email: string; password: string }): Promise<{ success: boolean; message?: string }> {
  try {
    const { data } = await api.post('/auth/login', {
      email: params.email,
      password: params.password,
    });

    if (!data?.success || !data?.token || !data?.user) {
      return { success: false, message: data?.message || 'Login failed' };
    }

    await AsyncStorage.multiSet([
      ['authToken', data.token],
      ['userData', JSON.stringify(data.user)],
      ['role', (data.user.role || '').toString().toLowerCase()],
    ]);
    return { success: true };
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Login failed';
    return { success: false, message };
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove(['authToken', 'userData', 'schoolCode', 'role']);
}

export async function getCurrentUser(): Promise<{ token: string | null; role: Role | null; schoolCode: string | null }> {
  const [token, role, schoolCode] = await AsyncStorage.multiGet(['authToken', 'role', 'schoolCode']).then((entries) => entries.map((e) => e[1]));
  return { token, role: (role as Role) || null, schoolCode };
}


