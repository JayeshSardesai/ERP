import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color }) => <Ionicons name="document-text" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <Ionicons name="notifications" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}