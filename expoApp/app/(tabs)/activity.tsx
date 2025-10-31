import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStudentMessages, Message } from '@/src/services/student';

export default function ActivityScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMessages = async () => {
    try {
      const data = await getStudentMessages();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getIconForMessageType = (subject: string) => {
    const lowerSubject = subject.toLowerCase();
    if (lowerSubject.includes('assignment')) return { icon: '📄', bg: '#DBEAFE' };
    if (lowerSubject.includes('grade') || lowerSubject.includes('result')) return { icon: '✓', bg: '#D1FAE5' };
    if (lowerSubject.includes('reminder')) return { icon: '🔔', bg: '#FED7AA' };
    if (lowerSubject.includes('announcement')) return { icon: '📢', bg: '#E9D5FF' };
    return { icon: '📨', bg: '#DBEAFE' };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={[styles.headerTitle, { marginTop: 12, fontSize: 16 }]}>Loading activity...</Text>
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
          <Text style={styles.headerTitle}>Activity</Text>
        </View>

        <View style={styles.section}>
          {messages.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No activity to display</Text>
            </View>
          ) : (
            messages.map((message) => {
              const iconData = getIconForMessageType(message.subject);
              return (
                <View key={message._id} style={styles.activityCard}>
                  <View style={[styles.iconContainer, { backgroundColor: iconData.bg }]}>
                    <Text style={styles.iconText}>{iconData.icon}</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {message.subject}
                      </Text>
                      <Text style={styles.activityTime}>{getTimeAgo(message.createdAt)}</Text>
                    </View>
                    <Text style={styles.activitySubtitle} numberOfLines={2}>
                      {message.message}
                    </Text>
                    <Text style={styles.activitySender}>
                      From: {message.sender} ({message.senderRole})
                    </Text>
                  </View>
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
    section: { paddingHorizontal: 20 },
    activityCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    iconText: { fontSize: 24 },
    activityContent: { flex: 1 },
    activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    activityTitle: { fontSize: 16, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937', flex: 1 },
    activityTime: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginLeft: 8 },
    activitySubtitle: { fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 4 },
    activitySender: { fontSize: 11, color: isDark ? '#6B7280' : '#9CA3AF', fontStyle: 'italic' },
    noDataContainer: { alignItems: 'center', marginTop: 40, paddingVertical: 40 },
    noDataText: { fontSize: 16, color: isDark ? '#93C5FD' : '#1E3A8A', fontWeight: '600' },
  });
}
