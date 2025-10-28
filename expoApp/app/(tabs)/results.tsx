import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ResultsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const testResults = [
    { id: 1, title: 'Formative Assessment 1', date: '8 March 2026', icon: '✏️', iconBg: '#D1FAE5', iconColor: '#10B981' },
    { id: 2, title: 'Mid Term Examination', date: '8 March 2026', icon: '📝', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
    { id: 3, title: 'Formative Assessment 2', date: '8 March 2026', icon: '✏️', iconBg: '#FECACA', iconColor: '#EF4444' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Results</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.map((test) => (
            <View key={test.id} style={styles.resultCard}>
              <View style={styles.resultLeft}>
                <View style={[styles.iconContainer, { backgroundColor: test.iconBg }]}>
                  <Text style={styles.iconText}>{test.icon}</Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>{test.title}</Text>
                  <Text style={styles.resultDate}>{test.date}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewDetailsButton}>
                <Text style={styles.viewDetailsText}>View Details</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#E0F2FE' },
    scrollView: { flex: 1 },
    header: { padding: 20, paddingTop: 10 },
    headerTitle: { fontSize: 24, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', textAlign: 'center' },
    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 12 },
    resultCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    resultLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    iconText: { fontSize: 24 },
    resultInfo: { flex: 1 },
    resultTitle: { fontSize: 16, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937', marginBottom: 4 },
    resultDate: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' },
    viewDetailsButton: { backgroundColor: '#60A5FA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    viewDetailsText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  });
}


