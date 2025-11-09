import React, { useState, useEffect } from 'react';
import { Users, User, MessageCircle, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import { useAcademicYear } from '../../../../contexts/AcademicYearContext';
import { toast } from 'react-hot-toast';
import api from '../../../../api/axios';

interface Message {
  id: string;
  class: string;
  section: string;
  adminId: string;
  title: string;
  subject: string;
  message: string;
  content: string;
  createdAt: string;
  timestamp: string;
  schoolId: string;
  messageAge: string;
  type: 'individual' | 'group';
  isRead: boolean;
  sender: string;
  recipient: string[];
}

const Messages: React.FC = () => {
  const { token, user } = useAuth();
  const { currentAcademicYear } = useAcademicYear();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch messages from backend
  useEffect(() => {
    fetchMessages();
  }, [currentAcademicYear]); // Refetch when academic year changes

  const fetchMessages = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching messages from teacher endpoint');

      const response = await api.get('/messages/teacher/messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();

      if (data.success) {
        // Backend returns messages in both data.messages and data.data.messages
        const fetchedMessages = data.messages || data.data?.messages || [];
        setMessages(fetchedMessages);
        console.log('✅ Fetched messages for academic year:', currentAcademicYear);
        console.log('✅ Total messages:', fetchedMessages.length);
        console.log('✅ Messages:', fetchedMessages);
      } else {
        toast.error(data.message || 'Failed to fetch messages');
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">School Messages</h1>
          <p className="text-gray-600">Messages sent by admins to students</p>
        </div>

        {/* Academic Year Badge */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md mt-4 sm:mt-0">
          <Calendar className="h-5 w-5" />
          <div className="flex flex-col">
            <span className="text-xs opacity-90">Academic Year</span>
            <span className="font-bold text-sm">
              {currentAcademicYear || 'Loading...'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Message List */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Messages from Admin</h2>
              <p className="text-sm text-gray-500 mt-1">
                Viewing messages for academic year: <span className="font-semibold text-indigo-600">{currentAcademicYear}</span>
              </p>
            </div>

            {loading ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="animate-spin h-8 w-8 sm:h-12 sm:w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-sm sm:text-base text-gray-600">Loading messages...</p>
              </div>
            ) : messages.length > 0 ? (
              <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 sm:p-5 border border-blue-100 hover:shadow-md transition-all duration-200"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 break-words">{message.title}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-xs sm:text-sm">
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                            Class {message.class}-{message.section}
                          </span>
                          <span className="text-gray-500 hidden sm:inline">•</span>
                          <span className="text-gray-600 font-medium break-words">{message.subject}</span>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 sm:gap-0">
                        <div className="flex items-center text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
                          <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                          <span className="whitespace-nowrap">{formatTimestamp(message.timestamp)}</span>
                        </div>
                        <span className="text-xs text-gray-400 sm:mt-1 whitespace-nowrap">
                          {new Date(message.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                      <p className="text-gray-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content || message.message}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3 pt-3 border-t border-blue-100 gap-2 sm:gap-0">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-xs text-gray-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                          From Admin
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 italic">
                        {message.messageAge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 sm:p-12 text-center">
                <MessageCircle className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-sm sm:text-base text-gray-600">Messages will appear here when available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;