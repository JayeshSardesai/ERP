import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { loginSchool, loginGlobal } from '@/src/services/auth';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();

  const [selectedRole, setSelectedRole] = useState<'Student' | 'Teacher' | 'Admin'>(
    params.role ? String(params.role) as 'Student' | 'Teacher' | 'Admin' : 'Student'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password || !schoolCode) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      console.log(`Attempting login with: ${email} (email or userId), school code: ${schoolCode}`);
      // Use identifier (email or userId) for login - backend supports both
      const res = await loginSchool({ identifier: email, password, schoolCode });

      if (!res || !res.success) {
        Alert.alert(res?.message || 'Invalid credentials. Please check your email/user ID, password, and school code.');
        setLoading(false);
        return;
      }
      console.log('Login successful, navigating to tabs');
      router.replace('/(tabs)');
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || e?.message || 'Connection error. Please check your network and try again.';
      Alert.alert('Login error', errorMessage);
      console.error('Login error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoTitle}>EduLogix</Text>
              <Text style={styles.logoSubtitle}>EMPOWERING TECHNOLOGIES</Text>
            </View>
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome</Text>
            <Text style={styles.welcomeSubtitle}>Login in to your account</Text>
          </View>

          <View style={styles.roleContainer}>
            {(['Student', 'Teacher'] as const).map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleButton, selectedRole === role && styles.roleButtonActive]}
                onPress={() => setSelectedRole(role)}
              >
                <Text style={[styles.roleButtonText, selectedRole === role && styles.roleButtonTextActive]}>{role}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {selectedRole === 'Student' ? 'Email or Student ID' : 'Email or Teacher ID'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={selectedRole === 'Student' ? 'Enter your email or student ID' : 'Enter your email or teacher ID'}
                placeholderTextColor={isDark ? '#6B7280' : '#93C5FD'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput style={styles.passwordInput} placeholder="Enter your password" placeholderTextColor={isDark ? '#6B7280' : '#93C5FD'} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>School Code</Text>
              <TextInput style={styles.input} placeholder="Enter your school code" placeholderTextColor={isDark ? '#6B7280' : '#93C5FD'} value={schoolCode} onChangeText={setSchoolCode} autoCapitalize="characters" />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Login</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#E0F2FE' },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    logoContainer: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
    logoPlaceholder: { alignItems: 'center' },
    logoImage: { width: 80, height: 80, marginBottom: 10 },
    logoTitle: { fontSize: 32, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 4 },
    logoSubtitle: { fontSize: 10, color: isDark ? '#93C5FD' : '#1E3A8A', letterSpacing: 2 },
    welcomeContainer: { alignItems: 'center', marginBottom: 24 },
    welcomeTitle: { fontSize: 28, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 4 },
    welcomeSubtitle: { fontSize: 14, color: '#60A5FA' },
    roleContainer: { flexDirection: 'row', marginBottom: 24, gap: 8 },
    roleButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD', alignItems: 'center' },
    roleButtonActive: { backgroundColor: '#60A5FA', borderColor: '#60A5FA' },
    roleButtonText: { fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A' },
    roleButtonTextActive: { color: '#FFFFFF' },
    formContainer: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 20, padding: 24, borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 8 },
    input: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: isDark ? '#E5E7EB' : '#1E3A8A' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD', borderRadius: 12 },
    passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: isDark ? '#E5E7EB' : '#1E3A8A' },
    eyeButton: { paddingHorizontal: 12 },
    eyeIcon: { fontSize: 20 },
    loginButton: { backgroundColor: '#60A5FA', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    loginButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });
}


