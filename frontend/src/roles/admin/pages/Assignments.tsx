import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Calendar, FileText, Download } from 'lucide-react';
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import EditAssignmentModal from '../components/EditAssignmentModal';
import * as assignmentAPI from '../../../api/assignment';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import api from '../../../api/axios';

interface Assignment {
  _id: string;
  title: string;
  subject: string;
  class: string;
  section?: string;
  teacher: string | { _id: string; name: string; firstName?: string; lastName?: string };
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'overdue';
  submissions: number;
  totalStudents: number;
  description: string;
}

const Assignments: React.FC = () => {
  // Use the useSchoolClasses hook to fetch classes configured by superadmin
  const {
    classesData,
    loading: classesLoading,
    error: classesError,
    getClassOptions,
    getSectionsByClass
  } = useSchoolClasses();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
    dueThisWeek: 0
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Calculate stats whenever assignments change
  useEffect(() => {
    if (assignments.length > 0) {
      calculateStatsFromAssignments();
    }
  }, [assignments]);

  // Fetch subjects when class changes and reset dependent filters
  useEffect(() => {
    if (selectedClass) {
      fetchSubjectsForClass(selectedClass);
      // Don't reset section here as it should be handled by the dropdown onChange
    } else {
      setSubjects([]);
      setSelectedSubject('');
      setSelectedSection(''); // Reset section when no class is selected
    }
  }, [selectedClass]);

  // Fetch assignments only once on component mount
  useEffect(() => {
    fetchAssignments();
  }, []);

  // Add effect to trigger re-render when filters change (for local filtering)
  useEffect(() => {
    // This effect doesn't need to do anything, it just triggers re-render when filters change
    // The filteredAssignments computed property will handle the actual filtering
    console.log('🔍 Filters changed, triggering local filter update');
  }, [selectedClass, selectedSection, selectedSubject, selectedFilter, searchTerm]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔍 Fetching assignments...');
      
      let data;
      let assignmentsArray = [];
      
      try {
        // Build filter parameters - don't send filters to API, handle locally like teacher portal
        const filterParams: any = {};
        // Only send basic params to API, handle filtering locally
        
        console.log('🔍 Admin fetching all assignments for local filtering');
        
        // Try the regular endpoint first
        data = await assignmentAPI.fetchAssignments();
        console.log('✅ Raw API response:', data);
        
        // Handle different response structures like teacher portal
        if (data.data && Array.isArray(data.data)) {
          assignmentsArray = data.data;
        } else if (data.assignments && Array.isArray(data.assignments)) {
          assignmentsArray = data.assignments;
        } else if (Array.isArray(data)) {
          assignmentsArray = data;
        }
        
        console.log('✅ Extracted assignments array:', assignmentsArray);
      } catch (regularError) {
        console.error('❌ Error with regular endpoint:', regularError);
        
        // If the regular endpoint fails, try the direct endpoint
        console.log('🔍 Trying direct test endpoint...');
        
        // Get the user's school code from the auth context
        let userSchoolCode = '';
        try {
          const authData = localStorage.getItem('erp.auth');
          if (authData) {
            const parsedAuth = JSON.parse(authData);
            userSchoolCode = parsedAuth.user?.schoolCode || '';
            console.log(`🏫 Using school code from auth: "${userSchoolCode}"`);
          }
        } catch (err) {
          console.error('Error parsing auth data:', err);
        }
        
        // Try direct endpoint with the user's school code
        const response = await api.get(`/direct-test/assignments?schoolCode=${userSchoolCode}`);
        data = response.data;
        console.log('✅ Direct endpoint response:', data);
        
        // Handle different response structures like teacher portal
        if (data.data && Array.isArray(data.data)) {
          assignmentsArray = data.data;
        } else if (data.assignments && Array.isArray(data.assignments)) {
          assignmentsArray = data.assignments;
        } else if (Array.isArray(data)) {
          assignmentsArray = data;
        }
      }
      
      console.log(`📊 Total assignments before filtering: ${assignmentsArray.length}`);
      
      // Validate each assignment has required fields like teacher portal
      const validAssignments = assignmentsArray.filter((assignment: any) => {
        if (!assignment || typeof assignment !== 'object') {
          console.log('❌ Invalid assignment (not an object):', assignment);
          return false;
        }
        const hasTitle = assignment.title && assignment.title.trim() !== '';
        const hasClass = assignment.class && assignment.class.trim() !== '';
        const hasSubject = assignment.subject && assignment.subject.trim() !== '';
        
        if (!hasTitle || !hasClass || !hasSubject) {
          console.log('❌ Invalid assignment (missing fields):', {
            title: assignment.title,
            class: assignment.class,
            subject: assignment.subject
          });
          return false;
        }
        
        return true;
      });
      
      console.log(`✅ Loaded ${validAssignments.length} valid assignments out of ${assignmentsArray.length} total`);
      console.log('📋 Valid assignments:', validAssignments);
      setAssignments(validAssignments);
    } catch (err: any) {
      console.error('❌ Error fetching assignments:', err);
      console.error('Error details:', err.message, err.response);
      setError(err.response?.data?.message || err.message || 'Failed to fetch assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Try to fetch from assignment stats endpoint
      const statsData = await assignmentAPI.getAssignmentStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
      // Fallback: calculate stats from assignments data
      calculateStatsFromAssignments();
    }
  };

  const calculateStatsFromAssignments = () => {
    if (!assignments || assignments.length === 0) {
      setStats({
        total: 0,
        active: 0,
        completed: 0,
        overdue: 0,
        dueThisWeek: 0
      });
      return;
    }

    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const calculatedStats = {
      total: assignments.length,
      active: 0,
      completed: 0,
      overdue: 0,
      dueThisWeek: 0
    };

    assignments.forEach(assignment => {
      const dueDate = new Date(assignment.dueDate);
      
      // Count by status
      if (assignment.status === 'active') calculatedStats.active++;
      if (assignment.status === 'completed') calculatedStats.completed++;
      if (assignment.status === 'overdue') calculatedStats.overdue++;
      
      // Count due this week
      if (dueDate >= now && dueDate <= weekFromNow) {
        calculatedStats.dueThisWeek++;
      }
    });

    setStats(calculatedStats);
  };

  const fetchSubjectsForClass = async (className: string) => {
    try {
      console.log(`🔍 Fetching subjects for class: ${className}`);
      
      // Get school code from localStorage or auth
      const schoolCode = localStorage.getItem('erp.schoolCode') || '';
      const authData = localStorage.getItem('erp.auth');
      let token = '';
      
      if (authData) {
        const parsedAuth = JSON.parse(authData);
        token = parsedAuth.token || '';
      }
      
      // Try the class-subjects API - use api instance instead of fetch to use smart interceptor
      const response = await api.get(`/class-subjects/class/${encodeURIComponent(className)}`);
      
      // Axios response structure is different from fetch
      const data = response.data;
      const subjectNames = (data?.data?.subjects || [])
        .filter((s: any) => s.isActive !== false)
        .map((s: any) => s.name)
        .filter(Boolean);
      setSubjects(subjectNames);
      console.log('✅ Subjects loaded:', subjectNames);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setSubjects([]);
    }
  };

  const handleAddAssignment = () => {
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    fetchAssignments();
  };

  const handleEditAssignment = (assignmentId: string) => {
    console.log('✏️ Edit assignment:', assignmentId);
    setSelectedAssignmentId(assignmentId);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    fetchAssignments();
    setShowEditModal(false);
    setSelectedAssignmentId('');
  };

  const handleDeleteAssignment = async (assignmentId: string, assignmentTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${assignmentTitle}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      console.log('🗑️ Deleting assignment:', assignmentId);
      await assignmentAPI.deleteAssignment(assignmentId);
      
      console.log('✅ Assignment deleted successfully');
      
      // Show success message
      alert('Assignment deleted successfully!');
      
      // Refresh the assignments list
      fetchAssignments();
    } catch (error: any) {
      console.error('❌ Error deleting assignment:', error);
      alert(error.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Local filtering function with enhanced logic
  const filteredAssignments = assignments.filter(assignment => {
    if (!assignment || typeof assignment !== 'object') return false;
    
    // Add null checks and normalize data
    const title = (assignment?.title || '').toString().trim();
    const subject = (assignment?.subject || '').toString().trim();
    const status = (assignment?.status || '').toString().toLowerCase();
    const assignmentClass = (assignment?.class || '').toString().trim();
    const assignmentSection = (assignment?.section || '').toString().trim();
    
    // Debug logging for first few assignments
    if (assignments.indexOf(assignment) < 3) {
      console.log(`🔍 Assignment ${assignments.indexOf(assignment) + 1}:`, {
        title,
        class: assignmentClass,
        section: assignmentSection,
        subject,
        status
      });
      console.log(`🔍 Filters:`, {
        selectedClass,
        selectedSection,
        selectedSubject,
        selectedFilter,
        searchTerm
      });
    }
    
    // Search filter - search in title and subject
    const matchesSearch = !searchTerm || searchTerm.trim() === '' ||
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter - match exact status or show all
    const matchesFilter = selectedFilter === 'all' || 
      status === selectedFilter.toLowerCase() ||
      (selectedFilter === 'active' && (status === 'active' || status === '')) ||
      (selectedFilter === 'overdue' && status === 'overdue');
    
    // Class filter - exact match or show all
    const matchesClass = !selectedClass || selectedClass === '' || 
      assignmentClass === selectedClass ||
      assignmentClass.toLowerCase() === selectedClass.toLowerCase();
    
    // Section filter - exact match or show all
    const matchesSection = !selectedSection || selectedSection === '' || 
      assignmentSection === selectedSection ||
      assignmentSection.toLowerCase() === selectedSection.toLowerCase();
    
    // Subject filter - exact match or show all
    const matchesSubject = !selectedSubject || selectedSubject === '' || 
      subject === selectedSubject ||
      subject.toLowerCase() === selectedSubject.toLowerCase();
    
    const result = matchesSearch && matchesFilter && matchesClass && matchesSection && matchesSubject;
    
    // Debug logging for first few assignments
    if (assignments.indexOf(assignment) < 3) {
      console.log(`🔍 Filter results:`, {
        matchesSearch,
        matchesFilter,
        matchesClass,
        matchesSection,
        matchesSubject,
        finalResult: result
      });
    }
    
    return result;
  });

  // Log filtering results
  console.log(`🔍 Total assignments: ${assignments.length}, Filtered: ${filteredAssignments.length}`);
  if (filteredAssignments.length === 0 && assignments.length > 0) {
    console.log('⚠️ No assignments match current filters:', {
      selectedClass,
      selectedSection,
      selectedSubject,
      selectedFilter,
      searchTerm
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
        <div className="flex space-x-3">
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
          <button
            onClick={handleAddAssignment}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Assignment
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading assignments...</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-500 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-500 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Due This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.dueThisWeek}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-1 gap-3">
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                // Reset section and subject when class changes
                setSelectedSection('');
                setSelectedSubject('');
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Classes</option>
              {getClassOptions().map((cls) => (
                <option key={cls.value} value={cls.value}>{cls.label}</option>
              ))}
            </select>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                // Reset subject when section changes since subjects are class+section specific
                if (e.target.value !== selectedSection) {
                  setSelectedSubject('');
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Sections</option>
              {(selectedClass ? getSectionsByClass(selectedClass) : []).map((section) => (
                <option key={section.value} value={section.value}>{section.label}</option>
              ))}
            </select>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-500 text-lg font-medium">No assignments found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm || selectedClass || selectedSection || selectedSubject || selectedFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Create your first assignment to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{assignment.title || 'Untitled Assignment'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.class || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.section || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.subject || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditAssignment(assignment._id)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Edit assignment"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAssignment(assignment._id, assignment.title)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete assignment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Assignment Modal */}
      {selectedAssignmentId && (
        <EditAssignmentModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAssignmentId('');
          }}
          onSuccess={handleEditSuccess}
          assignmentId={selectedAssignmentId}
        />
      )}
    </div>
  );
};

export default Assignments;