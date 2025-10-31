import React, { useState, useEffect } from 'react';
import { Calendar, Check, X, Clock, User, FileText, Filter, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface LeaveRequest {
  _id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  leaveType: 'sick' | 'casual' | 'emergency' | 'personal' | 'other';
  subject: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn: string;
  reviewedBy?: string;
  reviewedOn?: string;
  reviewComments?: string;
}

const LeaveManagement: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await api.get('/leave-requests');
      // setLeaveRequests(response.data.data);
      
      // Mock data
      const mockData: LeaveRequest[] = [
        {
          _id: '1',
          teacherId: 'T001',
          teacherName: 'John Doe',
          teacherEmail: 'john@school.com',
          leaveType: 'sick',
          subject: 'Sick Leave - Viral Fever',
          startDate: '2025-11-01',
          endDate: '2025-11-03',
          days: 3,
          reason: 'Suffering from viral fever and need rest as per doctor\'s advice.',
          status: 'pending',
          appliedOn: '2025-10-28',
        },
        {
          _id: '2',
          teacherId: 'T002',
          teacherName: 'Jane Smith',
          teacherEmail: 'jane@school.com',
          leaveType: 'casual',
          subject: 'Casual Leave - Family Function',
          startDate: '2025-11-05',
          endDate: '2025-11-05',
          days: 1,
          reason: 'Personal work - need to attend family function.',
          status: 'pending',
          appliedOn: '2025-10-29',
        },
        {
          _id: '3',
          teacherId: 'T003',
          teacherName: 'Robert Johnson',
          teacherEmail: 'robert@school.com',
          leaveType: 'emergency',
          subject: 'Emergency Leave - Family Emergency',
          startDate: '2025-10-30',
          endDate: '2025-10-30',
          days: 1,
          reason: 'Family emergency - need immediate attention.',
          status: 'approved',
          appliedOn: '2025-10-29',
          reviewedBy: 'Admin',
          reviewedOn: '2025-10-29',
          reviewComments: 'Approved due to emergency situation.',
        },
        {
          _id: '4',
          teacherId: 'T004',
          teacherName: 'Emily Davis',
          teacherEmail: 'emily@school.com',
          leaveType: 'personal',
          subject: 'Personal Leave - Travel',
          startDate: '2025-11-10',
          endDate: '2025-11-12',
          days: 3,
          reason: 'Need to travel for personal reasons.',
          status: 'rejected',
          appliedOn: '2025-10-27',
          reviewedBy: 'Admin',
          reviewedOn: '2025-10-28',
          reviewComments: 'Cannot approve as exams are scheduled during this period.',
        },
      ];
      
      setLeaveRequests(mockData);
      setFilteredRequests(mockData);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search
  useEffect(() => {
    let filtered = leaveRequests;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(req =>
        req.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.teacherEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [statusFilter, searchQuery, leaveRequests]);

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    try {
      // TODO: Replace with actual API call
      // await api.put(`/leave-requests/${requestId}/approve`, { comments: reviewComments });
      
      // Mock update
      setLeaveRequests(prev =>
        prev.map(req =>
          req._id === requestId
            ? {
                ...req,
                status: 'approved',
                reviewedBy: 'Admin',
                reviewedOn: new Date().toISOString().split('T')[0],
                reviewComments: reviewComments || 'Approved',
              }
            : req
        )
      );
      
      toast.success('Leave request approved successfully');
      setShowModal(false);
      setSelectedRequest(null);
      setReviewComments('');
    } catch (error) {
      console.error('Error approving leave request:', error);
      toast.error('Failed to approve leave request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(true);
    try {
      // TODO: Replace with actual API call
      // await api.put(`/leave-requests/${requestId}/reject`, { comments: reviewComments });
      
      // Mock update
      setLeaveRequests(prev =>
        prev.map(req =>
          req._id === requestId
            ? {
                ...req,
                status: 'rejected',
                reviewedBy: 'Admin',
                reviewedOn: new Date().toISOString().split('T')[0],
                reviewComments,
              }
            : req
        )
      );
      
      toast.success('Leave request rejected');
      setShowModal(false);
      setSelectedRequest(null);
      setReviewComments('');
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      toast.error('Failed to reject leave request');
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setReviewComments(request.reviewComments || '');
    setShowModal(true);
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'sick':
        return 'bg-red-100 text-red-800';
      case 'casual':
        return 'bg-blue-100 text-blue-800';
      case 'emergency':
        return 'bg-orange-100 text-orange-800';
      case 'personal':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Management</h1>
        <p className="text-gray-600">Review and manage teacher leave requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{leaveRequests.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {leaveRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {leaveRequests.filter(r => r.status === 'approved').length}
              </p>
            </div>
            <Check className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {leaveRequests.filter(r => r.status === 'rejected').length}
              </p>
            </div>
            <X className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by teacher name, email, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{request.teacherName}</div>
                          <div className="text-sm text-gray-500">{request.teacherId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </div>
                      <div className="text-sm text-gray-500">{request.days} day{request.days > 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.appliedOn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openModal(request)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Leave Request Details</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                    setReviewComments('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Teacher Info */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Teacher Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">{selectedRequest.teacherName}</span>
                  </div>
                  <p className="text-sm text-gray-600">{selectedRequest.teacherEmail}</p>
                  <p className="text-sm text-gray-600">ID: {selectedRequest.teacherId}</p>
                </div>
              </div>

              {/* Leave Details */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Leave Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-sm text-gray-600 block mb-1">Subject:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedRequest.subject}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 block mb-1">Description:</span>
                    <p className="text-sm text-gray-700">{selectedRequest.reason}</p>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Start Date:</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(selectedRequest.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">End Date:</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(selectedRequest.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedRequest.days} day{selectedRequest.days > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Information (if already reviewed) */}
              {selectedRequest.status !== 'pending' && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Review Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Reviewed By:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedRequest.reviewedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Reviewed On:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedRequest.reviewedOn && formatDate(selectedRequest.reviewedOn)}</span>
                    </div>
                    {selectedRequest.reviewComments && (
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Comments:</span>
                        <p className="text-sm text-gray-700">{selectedRequest.reviewComments}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedRequest._id)}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="h-5 w-5" />
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest._id)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <X className="h-5 w-5" />
                    {actionLoading ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
