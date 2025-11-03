import React, { useState, useEffect } from 'react';
import { Users, User, MessageCircle, Clock } from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import { toast } from 'react-hot-toast';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch messages from backend
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // Get school code from localStorage or user context
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
      
      const response = await fetch('/api/messages/teacher/messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-school-code': schoolCode
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch messages');
      }

      const data = await response.json();
      
      if (data.success) {
        // Handle both data.messages and data.data.messages formats
        const messages = data.data?.messages || data.messages || [];
        setMessages(messages);
        console.log('✅ Fetched messages:', messages);
        
        if (messages.length === 0) {
          console.log('ℹ️ No messages found for teacher');
        }
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">View your messages</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Message List */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Messages</h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading messages...</p>
              </div>
            ) : messages.length > 0 ? (
              <div className="p-6 space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100 hover:shadow-md transition-all duration-200"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{message.title}</h3>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Class {message.class}-{message.section}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600 font-medium">{message.subject}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end ml-4">
                        <div className="flex items-center text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {formatTimestamp(message.timestamp)}
                        </div>
                        <span className="text-xs text-gray-400 mt-1">
                          {new Date(message.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Message Content */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content || message.message}
                      </p>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-100">
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
              <div className="p-12 text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-600">Messages will appear here when available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;