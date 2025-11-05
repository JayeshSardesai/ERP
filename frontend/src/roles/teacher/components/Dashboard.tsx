import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import {
  Users,
  BookOpen,
  Calendar,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  FileText,
  ClipboardCheck,
  Send,
  Eye,
  Award,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface DashboardStats {
  totalAssignments: number;
  activeAssignments: number;
  leaveRequests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    year: number;
  };
  todayAttendance: {
    marked: boolean;
    classesCount: number;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssignments: 0,
    activeAssignments: 0,
    leaveRequests: { total: 0, pending: 0, approved: 0, rejected: 0, year: new Date().getFullYear() },
    todayAttendance: { marked: false, classesCount: 0 }
  });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [latestMessage, setLatestMessage] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching dashboard data...');

      // Fetch assignments (the /api/assignments endpoint already filters by teacher role)
      let assignmentsData: any = { assignments: [] };
      try {
        const assignmentsRes = await api.get('/assignments?limit=100');
        assignmentsData = assignmentsRes.data;
        console.log('✅ Assignments data:', assignmentsData);
      } catch (error) {
        console.warn('⚠️ Assignments API failed:', error);
      }

      // Fetch leave requests
      let leaveData: any = { success: false, data: { leaveRequests: [] } };
      try {
        const leaveRes = await api.get('/leave-requests/teacher/my-requests');
        leaveData = leaveRes.data;
        console.log('✅ Leave requests data:', leaveData);
      } catch (error) {
        console.warn('⚠️ Leave requests API failed:', error);
      }

      // Fetch latest message (teacher-specific endpoint)
      try {
        const messagesRes = await api.get('/messages/teacher/messages?limit=1');
        const messagesData = messagesRes.data;
        console.log('✅ Messages data:', messagesData);
        if (messagesData.messages && messagesData.messages.length > 0) {
          setLatestMessage(messagesData.messages[0]);
        }
      } catch (error) {
        console.warn('⚠️ Messages API failed:', error);
      }

      // Calculate stats
      const assignmentsArray = assignmentsData.assignments || [];
      const leaveRequestsArray = leaveData.data?.leaveRequests || [];

      console.log('📦 Extracted assignments:', assignmentsArray.length);
      console.log('📦 Extracted leave requests:', leaveRequestsArray.length);

      // Store in state for widgets
      setAssignments(assignmentsArray);
      setLeaveRequests(leaveRequestsArray);

      const totalAssignments = assignmentsArray.length;
      const activeAssignments = assignmentsArray.filter((a: any) => {
        const dueDate = new Date(a.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate >= today;
      }).length;

      // Filter leave requests for current year
      const currentYear = new Date().getFullYear();
      const yearlyLeaveRequests = leaveRequestsArray.filter((l: any) => {
        if (!l.startDate) return false;
        const leaveYear = new Date(l.startDate).getFullYear();
        return leaveYear === currentYear;
      });

      const totalLeaves = yearlyLeaveRequests.length;
      const pendingLeaves = yearlyLeaveRequests.filter((l: any) => l.status === 'pending').length;
      const approvedLeaves = yearlyLeaveRequests.filter((l: any) => l.status === 'approved').length;
      const rejectedLeaves = yearlyLeaveRequests.filter((l: any) => l.status === 'rejected').length;

      // Debug leave request statuses
      console.log('🔍 Leave request statuses:', leaveRequestsArray.map((l: any) => ({ id: l._id, status: l.status, startDate: l.startDate })));
      console.log(`📅 Yearly (${currentYear}) leave stats:`, {
        totalYearlyLeaves: totalLeaves,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
        allTimeTotal: leaveRequestsArray.length
      });
      console.log('📈 Calculated stats:', {
        totalAssignments,
        activeAssignments,
        totalLeaves,
        pendingLeaves,
        approvedLeaves
      });

      setStats({
        totalAssignments,
        activeAssignments,
        leaveRequests: {
          total: totalLeaves,
          pending: pendingLeaves,
          approved: approvedLeaves,
          rejected: rejectedLeaves,
          year: currentYear
        },
        todayAttendance: { marked: false, classesCount: 0 }
      });
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Total Assignments',
      value: stats.totalAssignments.toString(),
      icon: BookOpen,
      color: 'bg-blue-500',
      change: `${stats.activeAssignments} active`,
      onClick: () => onNavigate('assignments')
    },
    {
      name: `Leave Requests (${stats.leaveRequests.year})`,
      value: stats.leaveRequests.total.toString(),
      icon: Calendar,
      color: 'bg-green-500',
      change: `${stats.leaveRequests.pending} pending`,
      onClick: () => onNavigate('leave-request')
    },
    {
      name: `Approved Leaves (${stats.leaveRequests.year})`,
      value: stats.leaveRequests.approved.toString(),
      icon: CheckCircle,
      color: 'bg-emerald-500',
      change: `${stats.leaveRequests.rejected} rejected`,
      onClick: () => onNavigate('leave-request')
    },
    {
      name: 'Attendance',
      value: stats.todayAttendance.marked ? 'Marked' : 'Pending',
      icon: UserCheck,
      color: stats.todayAttendance.marked ? 'bg-green-500' : 'bg-orange-500',
      change: 'Today',
      onClick: () => onNavigate('attendance')
    }
  ];

  // Calculate days until next deadline with enhanced information
  const getDeadlineStatus = (dueDate: string) => {
    // Add debugging to identify NaN issues
    console.log('🔍 DEBUG: Processing dueDate:', dueDate, 'Type:', typeof dueDate);
    
    if (!dueDate) {
      console.warn('⚠️ WARNING: dueDate is null, undefined, or empty');
      return {
        text: 'No due date',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        priority: 'low'
      };
    }

    const due = new Date(dueDate);
    const today = new Date();
    
    // Check if date is valid
    if (isNaN(due.getTime())) {
      console.error('❌ ERROR: Invalid date format:', dueDate);
      return {
        text: 'Invalid date',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        priority: 'urgent'
      };
    }
    
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    due.setHours(23, 59, 59, 999); // Set to end of due date

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('🔍 DEBUG: Calculated diffDays:', diffDays, 'for assignment due:', due.toDateString());

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        text: `${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue`,
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        priority: 'urgent'
      };
    }
    if (diffDays === 0) return {
      text: 'Due Today',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
      priority: 'high'
    };
    if (diffDays === 1) return {
      text: 'Due Tomorrow',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
      priority: 'medium'
    };
    if (diffDays <= 3) return {
      text: `${diffDays} days left`,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      priority: 'medium'
    };
    if (diffDays <= 7) return {
      text: `${diffDays} days left`,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      priority: 'normal'
    };
    return {
      text: `${diffDays} days left`,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      priority: 'low'
    };
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Welcome back, {user?.name || 'Teacher'}!
            </h1>
            <p className="text-blue-100 mb-4 sm:mb-0">
              {user?.userId && `ID: ${user.userId} • `}
              {user?.schoolCode && `School: ${user.schoolCode}`}
            </p>
          </div>
          <div className="flex items-center bg-white bg-opacity-20 rounded-lg px-4 py-2">
            <Clock className="h-5 w-5 mr-2" />
            <span className="font-medium">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <button
                key={index}
                onClick={stat.onClick}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105 text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                <p className="text-xs text-gray-500">{stat.change}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Assignment Deadlines */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Deadlines</h2>
            <button
              onClick={() => onNavigate('assignments')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {assignments.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No assignments yet</p>
                <button
                  onClick={() => onNavigate('assignments')}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first assignment
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {assignments
                  .slice(0, 6) // Show more assignments
                  .sort((a: any, b: any) => {
                    // Sort by priority: urgent -> high -> medium -> normal -> low
                    const priorityOrder = { urgent: 0, high: 1, medium: 2, normal: 3, low: 4 };
                    const aPriority = getDeadlineStatus(a.dueDate).priority;
                    const bPriority = getDeadlineStatus(b.dueDate).priority;
                    return priorityOrder[aPriority] - priorityOrder[bPriority];
                  })
                  .map((assignment: any, index: number) => {
                    const deadline = getDeadlineStatus(assignment.dueDate);
                    const isUrgent = deadline.priority === 'urgent' || deadline.priority === 'high';

                    return (
                      <div
                        key={index}
                        className={`p-4 hover:bg-gray-50 transition-colors ${isUrgent ? 'border-l-4 border-red-400 bg-red-50' : ''
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {assignment.title || assignment.subject || 'Untitled Assignment'}
                              </h4>
                              {isUrgent && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                              {assignment.subject && (
                                <span className="flex items-center">
                                  <BookOpen className="h-3 w-3 mr-1" />
                                  {assignment.subject}
                                </span>
                              )}
                              {(assignment.class || assignment.section) && (
                                <span className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {assignment.class ? `Class ${assignment.class}` : ''}
                                  {assignment.class && assignment.section ? '-' : ''}
                                  {assignment.section || ''}
                                </span>
                              )}
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'No due date'}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${deadline.bgColor} ${deadline.color}`}>
                              {deadline.text}
                            </span>
                            {isUrgent && (
                              <span className="text-xs text-red-600 font-medium">
                                Action Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Messages */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Messages</h2>
            <button
              onClick={() => onNavigate('messages')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {!latestMessage ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">No messages yet</p>
                <button
                  onClick={() => onNavigate('messages')}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Send a message
                </button>
              </div>
            ) : (
              <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onNavigate('messages')}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {latestMessage.senderName?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {latestMessage.senderName || 'Unknown Sender'}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(latestMessage.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {latestMessage.subject}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {latestMessage.message}
                    </p>
                    {latestMessage.recipientType && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        To: {latestMessage.recipientType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave Status & Quick Info */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave Status</h2>
        <div className="space-y-4">
          {/* Pending Leaves */}
          {stats.leaveRequests.pending > 0 && (
            <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 text-sm">
                    {stats.leaveRequests.pending} Pending Leave Request{stats.leaveRequests.pending > 1 ? 's' : ''}
                  </h3>
                  <p className="text-xs text-yellow-700 mt-1">
                    Awaiting admin approval
                  </p>
                  <button
                    onClick={() => onNavigate('leave-request')}
                    className="mt-2 text-xs text-yellow-800 hover:text-yellow-900 font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Leave Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Leave Requests</h3>
            </div>
            {leaveRequests.length === 0 ? (
              <div className="p-6 text-center">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">No leave requests</p>
                <button
                  onClick={() => onNavigate('leave-request')}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Apply for leave
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {leaveRequests.slice(0, 3).map((leave: any, index: number) => (
                  <div key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{leave.subjectLine}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          <span className="mx-1">•</span>
                          {leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                          leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;