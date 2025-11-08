import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Import the separate home screens
import StudentHomeScreen from './student-home';
import TeacherHomeScreen from './teacher-home';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const styles = getStyles(isDark);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkRole = async () => {
    try {
      const [token, userData, storedRole] = await AsyncStorage.multiGet(['authToken', 'userData', 'role']).then(entries => entries.map(e => e[1]));
      
      if (!token || !userData) {
        router.replace('/login');
        return;
      }

      console.log('[HOME] User role:', storedRole);
      setRole(storedRole);
    } catch (error) {
      console.error('Error checking role:', error);
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRole();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={[styles.loadingText, { color: isDark ? '#93C5FD' : '#1E3A8A' }]}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Route to appropriate home screen based on role
  if (role === 'teacher') {
    return <TeacherHomeScreen />;
  } else if (role === 'student') {
    return <StudentHomeScreen />;
  } else {
    // Fallback for unknown roles
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <Text style={[styles.errorText, { color: isDark ? '#EF4444' : '#DC2626' }]}>Unknown user role</Text>
        <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Please contact support</Text>
      </SafeAreaView>
    );
  }
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0B0F14' : '#E0F2FE',
    },
    loadingText: {
      fontSize: 16,
      marginTop: 12,
    },
    errorText: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
    },
  });
}
