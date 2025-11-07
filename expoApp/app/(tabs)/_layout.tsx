import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import PermissionRefreshIndicator from '@/components/PermissionRefreshIndicator';

export default function TabLayout() {
  const colorScheme = useColorScheme();
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
    return null;
  }

  const isTeacher = role === 'teacher';

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
      
      {/* HOME TAB - Always visible */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => isTeacher ? 
            <Ionicons name="home" size={28} color={color} /> :
            <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      {/* TEACHER-ONLY TABS */}
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color }) => <Ionicons name="school" size={28} color={color} />,
          href: isTeacher ? '/classes' : null,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={28} color={color} />,
          href: isTeacher ? '/students' : null,
        }}
      />

      {/* SHARED TABS WITH DIFFERENT PURPOSES */}
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color }) => isTeacher ? 
            <Ionicons name="document-text" size={28} color={color} /> :
            <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />

      {/* ATTENDANCE TAB - Available for both students and teachers */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => isTeacher ? 
            <Ionicons name="calendar" size={28} color={color} /> :
            <IconSymbol size={28} name="calendar.badge.checkmark" color={color} />,
        }}
      />

      {/* RESULTS TAB - Available for both students and teachers */}
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color }) => isTeacher ? 
            <Ionicons name="bar-chart" size={28} color={color} /> :
            <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />

      {/* STUDENT-ONLY TABS */}
      <Tabs.Screen
        name="activity"
        options={{
          title: isTeacher ? 'Activity' : 'Messages',
          tabBarIcon: ({ color }) => isTeacher ? 
            <Ionicons name="notifications" size={28} color={color} /> :
            <IconSymbol size={28} name="message.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chevron.left.forwardslash.chevron.right" color={color} />,
          href: !isTeacher ? '/explore' : null,
        }}
      />

      {/* HIDE UNUSED SCREENS */}
      <Tabs.Screen
        name="teacher-home"
        options={{
          href: null,
        }}
      />
    </Tabs>
    <PermissionRefreshIndicator />
    </View>
  );
}