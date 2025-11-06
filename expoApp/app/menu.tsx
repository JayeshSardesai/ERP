import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MenuScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);
  const router = useRouter();

  const menuItems = [
    { id: 1, title: 'My Profile', icon: '👤', iconBg: '#FECACA', route: 'Profile' },
    { id: 2, title: 'My School', icon: '🏫', iconBg: '#DBEAFE', route: 'School' },
    { id: 3, title: 'My Fees', icon: '💰', iconBg: '#D1FAE5', route: 'Fees' },
    { id: 4, title: 'Settings', icon: '⚙️', iconBg: '#E9D5FF', route: 'Settings' },
  ];

  const handleMenuPress = (route: string) => {
    console.log(`Navigate to ${route}`);
  };

  const handleLogout = async () => {
    try {
      // Clear all stored authentication data
      await AsyncStorage.multiRemove(['authToken', 'userData', 'schoolCode']);
      
      // Navigate to the role selection screen (first page) and reset the navigation stack
      router.replace('/role');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error clearing storage, still navigate to role selection
      router.replace('/role');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Menu</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>🎓</Text>
            <Text style={styles.logoTitle}>EduLogix</Text>
            <Text style={styles.logoSubtitle}>BY SPANDHAN TECHNOLOGIES</Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => handleMenuPress(item.route)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#E0F2FE' },
    scrollView: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    backIcon: { fontSize: 28, color: isDark ? '#93C5FD' : '#1E3A8A' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A' },
    placeholder: { width: 40 },
    logoContainer: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
    logoPlaceholder: { alignItems: 'center' },
    logoText: { fontSize: 60, marginBottom: 10 },
    logoTitle: { fontSize: 28, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 4 },
    logoSubtitle: { fontSize: 9, color: isDark ? '#93C5FD' : '#1E3A8A', letterSpacing: 1.5 },
    menuContainer: { paddingHorizontal: 20, gap: 16 },
    menuItem: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconContainer: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    iconText: { fontSize: 28 },
    menuItemText: { fontSize: 18, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1E3A8A' },
    arrowIcon: { fontSize: 32, color: '#93C5FD', fontWeight: '300' },
    logoutContainer: { paddingHorizontal: 20, marginTop: 32 },
    logoutButton: { backgroundColor: '#EF4444', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });
}


