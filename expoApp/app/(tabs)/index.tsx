import React, { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StudentHomeScreen from './student-home';
import TeacherHomeScreen from './teacher-home';

export default function HomeScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const storedRole = await AsyncStorage.getItem('role');
      setRole(storedRole);
    } catch (error) {
      console.error('Error checking role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </SafeAreaView>
    );
  }

  // Route to appropriate home screen based on role
  if (role === 'teacher') {
    return <TeacherHomeScreen />;
  }

  // Default to student home
  return <StudentHomeScreen />;
}
