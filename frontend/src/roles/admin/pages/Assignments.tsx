import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Calendar, FileText, Download } from 'lucide-react';
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import EditAssignmentModal from '../components/EditAssignmentModal';
import * as assignmentAPI from '../../../api/assignment';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import { useAuth } from '../../../auth/AuthContext';
import api from '../../../api/axios';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';

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
  _placeholder?: boolean;
  academicYear?: string;
}

const Assignments: React.FC = () => {
  const { user } = useAuth();

  // Use the useSchoolClasses hook to fetch classes configured by superadmin
  const {
    classesData,
    loading: classesLoading,
    error: classesError,
    getClassOptions,
    getSectionsByClass
  } = useSchoolClasses();

  // Academic year context
  const { currentAcademicYear, viewingAcademicYear, isViewingHistoricalYear, setViewingYear, availableYears } = useAcademicYear();

  const [searchTerm, setSearchTerm] = useState('');
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
  }, [viewingAcademicYear]);

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

  // Fetch assignments only once on component mount - filter locally instead of refetching

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔍 Admin fetching assignments...');

      console.log('🔍 Fetching assignments for academic year:', viewingAcademicYear);

      let data;
      let assignmentsArray = [];

      try {
        // Try the regular endpoint first with academic year parameter
        data = await assignmentAPI.fetchAssignments({
          academicYear: viewingAcademicYear
        });
        console.log('✅ Assignments fetched from regular endpoint:', data);
      } catch (regularError) {
        console.error('❌ Error with regular endpoint:', regularError);

        // If the regular endpoint fails, try the direct endpoint
        const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
        console.log('🔍 Trying direct endpoint with schoolCode:', schoolCode);

        const response = await api.get(`/direct-test/assignments?schoolCode=${schoolCode}`);
        data = response.data;
        console.log('✅ Direct endpoint response:', data);

        // Handle different response structures exactly like teacher portal
        if (data.data && Array.isArray(data.data)) {
          assignmentsArray = data.data;
        } else if (data.assignments && Array.isArray(data.assignments)) {
          assignmentsArray = data.assignments;
        } else if (Array.isArray(data)) {
          assignmentsArray = data;
        }
      }

      console.log(`📊 Total assignments before filtering: ${assignmentsArray.length}`);

      // Log all assignments to debug the data structure
      console.log('🔍 Raw assignments data:', assignmentsArray);

      // Filter out placeholder assignments and validate real assignments
      const validAssignments = assignmentsArray.filter((assignment: any) => {
        if (!assignment || typeof assignment !== 'object') {
          console.log('❌ Invalid assignment (not an object):', assignment);
          return false;
        }

        // Check for assignment ID (required for operations)
        const hasId = assignment._id || assignment.id;
        if (!hasId) {
          console.log('❌ Invalid assignment (missing ID):', assignment);
          return false;
        }

        // Skip placeholder assignments - they don't have real data
        if (assignment._placeholder === true) {
          console.log('⏭️ Skipping placeholder assignment:', assignment._id);
          return false;
        }

        // Skip assignments with missing essential fields
        if (!assignment.title && !assignment.subject && !assignment.class) {
          console.log('⏭️ Skipping assignment with missing essential fields:', assignment._id);
          return false;
        }

        return true; // Accept all non-placeholder assignments with valid ID
      });

      console.log(`✅ Loaded ${validAssignments.length} valid assignments out of ${assignmentsArray.length} total`);
      console.log('📋 Valid assignments:', validAssignments);

      // If we have assignments but they're all placeholders, inform the user
      if (assignmentsArray.length > 0 && validAssignments.length === 0) {
        console.log('ℹ️ INFO: All assignments are placeholders - no real assignments found');
      }

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

      // Use the same approach as teacher page - fetch all classes and find the specific one
      const response = await api.get('/class-subjects/classes');
      const data = response.data;

      // Get all subjects for this class (regardless of section initially)
      const classesForThisName = data?.data?.classes?.filter((c: any) => c.className === className) || [];
      const allSubjects = new Set();

      classesForThisName.forEach((classData: any) => {
        const activeSubjects = (classData?.subjects || []).filter((s: any) => s.isActive !== false);
        activeSubjects.forEach((s: any) => {
          if (s.name) allSubjects.add(s.name);
        });
      });

      const subjectNames = Array.from(allSubjects) as string[];
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

  // Calculate days until deadline
  const getDeadlineStatus = (dueDate: string) => {
    if (!dueDate) {
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

  // Local filtering function - shows all assignments initially, filters when criteria are applied
  const filteredAssignments = assignments.filter(assignment => {
    if (!assignment || typeof assignment !== 'object') return false;

    // Normalize data with null checks
    const title = (assignment?.title || '').toString().trim();
    const subject = (assignment?.subject || '').toString().trim();
    const assignmentClass = (assignment?.class || '').toString().trim();
    const assignmentSection = (assignment?.section || '').toString().trim();

    // Search filter - search in title and subject (empty = show all)
    const matchesSearch = !searchTerm || searchTerm.trim() === '' ||
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || status === selectedFilter;
    const matchesClass = !selectedClass || assignmentClass === selectedClass;
    const matchesSubject = !selectedSubject || subject === selectedSubject;
    const matchesAcademicYear = !viewingAcademicYear || assignment.academicYear === viewingAcademicYear;

    // Debug individual assignment filtering
    if (assignment._id === '6905a0b614065ebef374bfdd') { // Debug the specific assignment we saw in logs
      console.log('🔍 ASSIGNMENT FILTER DEBUG:', {
        assignmentId: assignment._id,
        title: assignment.title,
        class: assignment.class,
        section: assignment.section,
        subject: assignment.subject,
        _placeholder: assignment._placeholder,
        filters: { searchTerm, selectedClass, selectedSection, selectedSubject },
        matches: { matchesSearch, matchesClass, matchesSection, matchesSubject },
        finalResult: result
      });
    }

    return matchesSearch && matchesFilter && matchesClass && matchesSubject && matchesAcademicYear;
  });

  // Calculate stats from filtered assignments (updates based on current filters)
  const calculateFilteredStats = () => {
    if (!filteredAssignments || filteredAssignments.length === 0) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        overdue: 0,
        dueThisWeek: 0
      };
    }

    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const calculatedStats = {
      total: filteredAssignments.length,
      active: 0,
      completed: 0,
      overdue: 0,
      dueThisWeek: 0
    };

    filteredAssignments.forEach(assignment => {
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

    return calculatedStats;
  };

  // Get current stats based on filtered assignments
  const currentStats = calculateFilteredStats();

  // Log filtering results
  console.log(`🔍 Total assignments: ${assignments.length}, Filtered: ${filteredAssignments.length}`);
  if (filteredAssignments.length === 0 && assignments.length > 0) {
    console.log('⚠️ No assignments match current filters:', {
      selectedClass,
      selectedSection,
      selectedSubject,
      searchTerm
    });
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Assignments</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </button>
            <button
              onClick={handleAddAssignment}
              className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-500 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{currentStats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Due This Week</p>
                <p className="text-2xl font-bold text-gray-900">{currentStats.dueThisWeek}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={viewingAcademicYear}
                onChange={(e) => setViewingYear(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year} {year === currentAcademicYear && '(Current)'}
                  </option>
                ))}
              </select>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  // Reset section and subject when class changes
                  setSelectedSection('');
                  setSelectedSubject('');
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Sections</option>
                {(selectedClass ? getSectionsByClass(selectedClass) : []).map((section) => (
                  <option key={section.value} value={section.value}>{section.label}</option>
                ))}
              </select>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Assignments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header with Total Count */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Assignments</h3>
              <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                <span>Total: <span className="font-semibold text-gray-900">{assignments.length}</span></span>
                {(searchTerm || selectedClass || selectedSection || selectedSubject) && (
                  <span>Filtered: <span className="font-semibold text-blue-600">{filteredAssignments.length}</span></span>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Class</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Section</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Subject</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 sm:h-12 w-8 sm:w-12 text-gray-400 mb-3" />
                        <p className="text-gray-500 text-base sm:text-lg font-medium">No assignments found</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-2">
                          {assignments.length === 0
                            ? 'No assignments created yet. Create your first assignment to get started!'
                            : 'No assignments match your current filters. Try adjusting your search criteria.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <tr key={assignment._id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{assignment.title || assignment.subject || 'Untitled Assignment'}</div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {assignment.class && `Class ${assignment.class}`}
                          {assignment.section && ` • Section ${assignment.section}`}
                          {assignment.subject && ` • ${assignment.subject}`}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                        {assignment.class || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                        {assignment.section || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                        {assignment.subject || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <Calendar className="h-3 sm:h-4 w-3 sm:w-4 mr-1 text-gray-400" />
                            <span className="truncate">{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}</span>
                          </div>
                          {assignment.dueDate && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDeadlineStatus(assignment.dueDate).bgColor} ${getDeadlineStatus(assignment.dueDate).color}`}>
                              {getDeadlineStatus(assignment.dueDate).text}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-1 sm:space-x-2">
                          <button
                            onClick={() => handleEditAssignment(assignment._id)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Edit assignment"
                          >
                            <Edit2 className="h-3 sm:h-4 w-3 sm:w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(assignment._id, assignment.title)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Delete assignment"
                          >
                            <Trash2 className="h-3 sm:h-4 w-3 sm:w-4" />
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
    </>
  );
};

export default Assignments;