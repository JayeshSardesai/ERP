import { Tabs } from 'expo-router';
// import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="checklist" color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.xyaxis.line" color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
// import { Tabs } from 'expo-router';
// import React from 'react';

// import { HapticTab } from '@/components/haptic-tab';
// import { IconSymbol } from '@/components/ui/icon-symbol';
// import { Colors } from '@/constants/theme';
// import { useColorScheme } from '@/hooks/use-color-scheme';

// export default function TabLayout() {
//   const colorScheme = useColorScheme();

//   return (
//     <Tabs
//       screenOptions={{
//         tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
//         headerShown: false,
//         tabBarButton: HapticTab,
//       }}>
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Home',
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="assignments"
//         options={{
//           title: 'Assignments',
//           // More appropriate for assignments/work
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
//           // Alternative options: "list.bullet.clipboard", "checklist.checked", "pencil.and.list.clipboard"
//         }}
//       />
//       <Tabs.Screen
//         name="attendance"
//         options={{
//           title: 'Attendance',
//           // Better represents attendance/calendar with checkmarks
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar.badge.checkmark" color={color} />,
//           // Alternative options: "person.crop.circle.badge.checkmark", "checkmark.circle.fill"
//         }}
//       />
//       <Tabs.Screen
//         name="results"
//         options={{
//           title: 'Results',
//           // Better for academic results/grades
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
//           // Alternative options: "graduationcap.fill", "a.square.fill", "number.circle.fill"
//         }}
//       />
//       <Tabs.Screen
//         name="activity"
//         options={{
//           title: 'Activity',
//           // More generic activity/notification icon
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.badge.fill" color={color} />,
//           // Alternative options: "waveform.path.ecg", "app.badge.fill", "message.badge.fill"
//         }}
//       />
//     </Tabs>
//   );
// }