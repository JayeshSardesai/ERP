import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStudentResults, Result } from '@/src/services/student';

export default function ResultsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResults = async () => {
    try {
      const data = await getStudentResults();
      setResults(data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchResults();
  };

  const getIconForExamType = (examType: string) => {
    if (examType.toLowerCase().includes('formative') || examType.toLowerCase().includes('fa')) {
      return { icon: '✏️', bg: '#D1FAE5', color: '#10B981' };
    } else if (examType.toLowerCase().includes('mid') || examType.toLowerCase().includes('term')) {
      return { icon: '📝', bg: '#FEF3C7', color: '#F59E0B' };
    } else {
      return { icon: '📄', bg: '#FECACA', color: '#EF4444' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Loading results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Results</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {results.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No results available yet</Text>
            </View>
          ) : (
            results.map((result) => {
              const iconData = getIconForExamType(result.examType);
              return (
                <View key={result._id} style={styles.resultCard}>
                  <View style={styles.resultLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: iconData.bg }]}>
                      <Text style={styles.iconText}>{iconData.icon}</Text>
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{result.examType}</Text>
                      <Text style={styles.resultDate}>
                        {result.overallPercentage.toFixed(1)}% • {result.overallGrade || 'N/A'}
                      </Text>
                      <Text style={styles.resultSubjects}>
                        {result.subjects.length} subjects
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.viewDetailsButton}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
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
    resultDate: { fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 2 },
    resultSubjects: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' },
    viewDetailsButton: { backgroundColor: '#60A5FA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    viewDetailsText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
    noDataContainer: { alignItems: 'center', marginTop: 40, paddingVertical: 40 },
    noDataText: { fontSize: 16, color: isDark ? '#93C5FD' : '#1E3A8A', fontWeight: '600' },
  });
}
