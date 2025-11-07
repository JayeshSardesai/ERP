import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} />,
        }}
      />
      {isTeacher ? (
        <>
          <Tabs.Screen
            name="classes"
            options={{
              title: 'Classes',
              tabBarIcon: ({ color }) => <Ionicons name="school" size={28} color={color} />,
            }}
          />
          <Tabs.Screen
            name="students"
            options={{
              title: 'Students',
              tabBarIcon: ({ color }) => <Ionicons name="people" size={28} color={color} />,
            }}
          />
          <Tabs.Screen
            name="assignments"
            options={{
              title: 'Assignments',
              tabBarIcon: ({ color }) => <Ionicons name="document-text" size={28} color={color} />,
            }}
          />
          <Tabs.Screen
            name="activity"
            options={{
              title: 'Activity',
              tabBarIcon: ({ color }) => <Ionicons name="notifications" size={28} color={color} />,
            }}
          />
        </>
      ) : (
        <>
          <Tabs.Screen
            name="assignments"
            options={{
              title: 'Assignments',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="attendance"
            options={{
              title: 'Attendance',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar.badge.checkmark" color={color} />,
            }}
          />
          <Tabs.Screen
            name="results"
            options={{
              title: 'Results',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="activity"
            options={{
              title: 'Messages',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="message.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: 'Explore',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="chevron.left.forwardslash.chevron.right" color={color} />,
            }}
          />
        </>
      )}
    </Tabs>
  );
}