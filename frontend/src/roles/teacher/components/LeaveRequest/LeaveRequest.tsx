import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../auth/AuthContext';
import { toast } from 'react-hot-toast';

interface LeaveRequestForm {
  teacherName: string;
  teacherId: string;
  subjectLine: string;
  startDate: string;
  endDate: string;
  description: string;
}

const LeaveRequest: React.FC = () => {
  const { user, token } = useAuth();
  const [saving, setSaving] = useState(false);

  console.log('🔍 LeaveRequest - User data:', user);
  console.log('🔍 LeaveRequest - userId:', user?.userId);
  console.log('🔍 LeaveRequest - User keys:', user ? Object.keys(user) : 'No user');
  console.log('🔍 LeaveRequest - User.id:', user?.id);

  const [leaveRequest, setLeaveRequest] = useState<LeaveRequestForm>({
    teacherName: '',
    teacherId: '',
    subjectLine: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  // Update form when user data becomes available
  useEffect(() => {
    if (user) {
      // Try multiple possible ID fields as fallback
      const teacherId = user.userId || user.id || '';
      console.log('🔄 Updating form with user data:', { 
        name: user.name, 
        userId: user.userId, 
        id: user.id, 
        finalTeacherId: teacherId 
      });
      setLeaveRequest(prev => ({
        ...prev,
        teacherName: user.name || '',
        teacherId: teacherId
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLeaveRequest(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leaveRequest.subjectLine || !leaveRequest.startDate || !leaveRequest.endDate || !leaveRequest.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(leaveRequest.endDate) < new Date(leaveRequest.startDate)) {
      toast.error('End date must be after or equal to start date');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/leave-requests/teacher/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(leaveRequest)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Leave request submitted successfully!');
        // Reset form but keep teacher info
        setLeaveRequest({
          teacherName: user?.name || '',
          teacherId: user?.userId || '',
          subjectLine: '',
          startDate: '',
          endDate: '',
          description: ''
        });
      } else {
        toast.error(data.message || 'Failed to submit leave request');
      }
    } catch (error: any) {
      console.error('❌ Error submitting leave request:', error);
      toast.error(error.message || 'Failed to submit leave request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Leave Request Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Submit Leave Request</h2>
          <p className="text-sm text-gray-600 mt-1">Fill in the details below to request leave</p>
        </div>

        <div className="space-y-6">
            {/* Teacher Name and Teacher ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teacher Name *</label>
                <input
                  type="text"
                  name="teacherName"
                  value={leaveRequest.teacherName}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teacher ID *</label>
                <input
                  type="text"
                  name="teacherId"
                  value={leaveRequest.teacherId}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Subject Line */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line *</label>
              <input
                type="text"
                name="subjectLine"
                value={leaveRequest.subjectLine}
                onChange={handleChange}
                placeholder="e.g., Medical Leave, Personal Leave"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Leave Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Leave Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={leaveRequest.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Leave End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={leaveRequest.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                name="description"
                value={leaveRequest.description}
                onChange={handleChange}
                rows={4}
                placeholder="Provide details about your leave request..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setLeaveRequest({
                    teacherName: user?.name || '',
                    teacherId: user?.userId || '',
                    subjectLine: '',
                    startDate: '',
                    endDate: '',
                    description: ''
                  });
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Request</span>
                )}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequest;
