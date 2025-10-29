import React, { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, DollarSign, Users, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import ClassSectionSelect from '../components/ClassSectionSelect';
import api from '../../../api/axios';
import { 
  getSchoolSummary,
  getStudentFeeRecords, 
  StudentFeeRecord, 
  exportFeeRecordsToCSV 
} from '../../../api/reports';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { bg: string; text: string }> = {
    paid: { bg: 'bg-green-100', text: 'text-green-800' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    overdue: { bg: 'bg-red-100', text: 'text-red-800' },
    partial: { bg: 'bg-blue-100', text: 'text-blue-800' },
  };

  const statusConfig = statusMap[status.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  
  // Filter state
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Real data will be fetched from API
  const [summary, setSummary] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    avgMarks: 0,
    classWiseDues: []
  });
  
  const [classWiseCounts, setClassWiseCounts] = useState<Array<{
    className: string;
    sections: Array<{name: string, count: number}>;
    total: number;
  }>>([]);

  // State for dues list
  const [duesList, setDuesList] = useState<StudentFeeRecord[]>([]);
  const [loadingDues, setLoadingDues] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Handle export to CSV
  const handleExportToCSV = async () => {
    try {
      const params = {
        class: selectedClass !== 'ALL' ? selectedClass : undefined,
        section: selectedSection !== 'ALL' ? selectedSection : undefined,
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      };

      const csvBlob = await exportFeeRecordsToCSV(params);
      
      // Create a download link
      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.setAttribute('download', `fee-due-report-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error exporting to CSV:', err);
      setError('Failed to export data. Please try again.');
    }
  };

  // Fetch due fees data
  const fetchDuesList = useCallback(async () => {
    try {
      setLoadingDues(true);
      setError(null);
      
      const params = {
        class: selectedClass !== 'ALL' ? selectedClass : undefined,
        section: selectedSection !== 'ALL' ? selectedSection : undefined,
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      };
      
      const response = await getStudentFeeRecords(params);
      
      if (response.success) {
        setDuesList(response.data.records);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          pages: response.data.pagination.pages
        }));
      } else {
        throw new Error('Failed to fetch dues list');
      }
    } catch (err) {
      console.error('Error fetching dues list:', err);
      setError('Failed to load dues data. Please try again.');
    } finally {
      setLoadingDues(false);
    }
  }, [selectedClass, selectedSection, pagination.page, pagination.limit, searchTerm, statusFilter]);

  // Fetch class and section wise student counts - simplified version
  const fetchClassWiseCounts = useCallback(async () => {
    console.log('🔍 [fetchClassWiseCounts] Starting fetch...');
    
    try {
      // First, try the class-summary endpoint
      console.log('Trying /reports/class-summary endpoint...');
      const response = await api.get('/reports/class-summary');
      console.log('API Response:', {
        status: response.status,
        data: response.data
      });

      // If we got here, the request was successful
      if (response.data?.success && response.data.data) {
        console.log('Using class-summary data');
        const classData = response.data.data;
        
        // If it's an array, format it
        if (Array.isArray(classData)) {
          const formatted = classData.map((item: any) => ({
            className: item.className || item.name || item._id || 'Unknown',
            sections: Array.isArray(item.sections) 
              ? item.sections.map((s: any) => ({
                  name: s.name || s.section || 'All',
                  count: s.count || s.totalStudents || 0
                }))
              : [{ name: 'All', count: item.totalStudents || 0 }],
            total: item.totalStudents || 0
          }));
          
          setClassWiseCounts(formatted);
          setError(null);
          return;
        }
        
        // If it's an object with class data
        if (typeof classData === 'object' && classData !== null) {
          const formatted = Object.entries(classData).map(([key, value]) => ({
            className: key,
            sections: [{ name: 'All', count: Number(value) || 0 }],
            total: Number(value) || 0
          }));
          
          setClassWiseCounts(formatted);
          setError(null);
          return;
        }
      }
      
      // If we get here, try an alternative approach - get all students and count by class
      console.log('Trying alternative approach - fetching all students...');
      const studentsResponse = await api.get('/students', {
        params: { limit: 1000 } // Adjust limit as needed
      });
      
      if (studentsResponse.data?.success && Array.isArray(studentsResponse.data.data?.students)) {
        const students = studentsResponse.data.data.students;
        
        // Group students by class and section
        const classMap = new Map();
        
        students.forEach((student: any) => {
          const className = student.targetClass || 'Unknown';
          const section = student.targetSection || 'All';
          
          if (!classMap.has(className)) {
            classMap.set(className, {
              className,
              sections: new Map(),
              total: 0
            });
          }
          
          const classData = classMap.get(className);
          classData.total++;
          
          if (!classData.sections.has(section)) {
            classData.sections.set(section, 0);
          }
          classData.sections.set(section, classData.sections.get(section) + 1);
        });
        
        // Convert to the expected format
        const formattedData = Array.from(classMap.values()).map(classData => ({
          className: classData.className,
          sections: Array.from(classData.sections.entries()).map(([name, count]) => ({
            name,
            count
          })),
          total: classData.total
        }));
        
        setClassWiseCounts(formattedData);
        setError(null);
        return;
      }
      
      // If we get here, no data was found
      console.warn('No class data found in any format');
      setClassWiseCounts([]);
      setError('No class data available');
      
    } catch (error) {
      console.error('❌ Error fetching class data:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      // Set a more helpful error message
      let errorMessage = 'Failed to load class distribution data';
      
      if (error.response) {
        // Server responded with an error status
        if (error.response.status === 404) {
          errorMessage = 'Class summary endpoint not found';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error occurred while fetching class data';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Request was made but no response
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
      setClassWiseCounts([]);
    }
  }, []);

  // Fetch school summary data
  const fetchSchoolSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        targetClass: selectedClass !== 'ALL' ? selectedClass : undefined,
        targetSection: selectedSection !== 'ALL' ? selectedSection : undefined
      };
      
      // Fetch both summary and class-wise counts in parallel
      const [summaryResponse] = await Promise.all([
        getSchoolSummary(params),
        fetchClassWiseCounts()
      ]);
      
      if (summaryResponse.success) {
        setSummary(prev => ({
          ...prev,
          totalStudents: summaryResponse.data.totalStudents || 0,
          avgAttendance: summaryResponse.data.avgAttendance || 0,
          avgMarks: summaryResponse.data.avgMarks || 0
        }));
      } else {
        throw new Error(summaryResponse.message || 'Failed to fetch school summary');
      }
    } catch (err) {
      console.error('Error fetching school summary:', err);
      setError('Failed to load school summary data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedClass, selectedSection]);

  // Load data when component mounts or filters change
  useEffect(() => {
    if (activeTab === 'dues') {
      fetchDuesList();
    } else if (activeTab === 'overview') {
      fetchSchoolSummary();
    }
  }, [activeTab, fetchDuesList, fetchSchoolSummary]);
  
  // Reset to first page when filters change
  useEffect(() => {
    if (activeTab === 'dues') {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [selectedClass, selectedSection, searchTerm, statusFilter, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">School Reports</h1>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('dues')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dues'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dues List
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Global Filters */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ClassSectionSelect
                schoolId={user?.schoolId}
                valueClass={selectedClass}
                valueSection={selectedSection}
                onClassChange={setSelectedClass}
                onSectionChange={setSelectedSection}
              />
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Students Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      {loading ? (
                        <div className="h-8 bg-gray-200 rounded animate-pulse mt-1 w-3/4"></div>
                      ) : (
                        <p className="text-2xl font-semibold text-gray-900">
                          {summary.totalStudents.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Avg Attendance Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                      {loading ? (
                        <div className="h-8 bg-gray-200 rounded animate-pulse mt-1 w-3/4"></div>
                      ) : (
                        <div className="flex items-baseline">
                          <p className="text-2xl font-semibold text-gray-900">
                            {summary.avgAttendance.toFixed(1)}%
                          </p>
                          <span className="ml-2 text-sm text-gray-500">
                            this month
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Avg Marks Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-600">Avg Marks</p>
                      {loading ? (
                        <div className="h-8 bg-gray-200 rounded animate-pulse mt-1 w-3/4"></div>
                      ) : (
                        <div className="flex items-baseline">
                          <p className="text-2xl font-semibold text-gray-900">
                            {summary.avgMarks.toFixed(1)}%
                          </p>
                          <span className="ml-2 text-sm text-gray-500">
                            current term
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Class & Section Wise Students */}
              <div className="bg-white rounded-lg shadow mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Students by Class & Section</h3>
                </div>
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="p-6 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : classWiseCounts.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Class
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Section
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Students
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {classWiseCounts.map((classItem) => (
                          <React.Fragment key={classItem.className}>
                            {classItem.sections.map((section, idx) => (
                              <tr key={`${classItem.className}-${section.name}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {idx === 0 && (
                                    <div className="text-sm font-medium text-gray-900">
                                      Class {classItem.className}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {section.name || 'All Sections'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-900">
                                      {section.count.toLocaleString()}
                                    </span>
                                    {idx === 0 && classItem.sections.length > 1 && (
                                      <span className="ml-2 text-xs text-gray-500">
                                        (Total: {classItem.total})
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      No class/section data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dues Tab */}
          {activeTab === 'dues' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <div className="flex space-x-2">
                  <button
                    onClick={handleExportToCSV}
                    disabled={loadingDues}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {loadingDues ? 'Exporting...' : 'Export to CSV'}
                  </button>
                  <button
                    onClick={fetchDuesList}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    disabled={loadingDues}
                  >
                    {loadingDues ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Outstanding Dues</h3>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search students..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="PARTIAL">Partial</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class / Section
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pending
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        {/* Next Due column removed as requested */}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingDues ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                          </td>
                        </tr>
                      ) : duesList.length > 0 ? (
                        duesList.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                                  {record.rollNumber && (
                                    <div className="text-sm text-gray-500">{record.rollNumber}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{record.studentClass}</div>
                              <div className="text-sm text-gray-500">Sec: {record.studentSection}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(record.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {formatCurrency(record.totalPaid)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                              {formatCurrency(record.totalPending)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={record.status.toLowerCase()} />
                            </td>
                            {/* Next Due data cell removed as requested */}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                            No dues records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                        disabled={pagination.page === 1}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                          pagination.page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                        disabled={pagination.page >= pagination.pages}
                        className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                          pagination.page >= pagination.pages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                          <span className="font-medium">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                          </span>{' '}
                          of <span className="font-medium">{pagination.total}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                            disabled={pagination.page === 1}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                              pagination.page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Previous</span>
                            &larr;
                          </button>
                          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                            // Show first page, last page, current page, and pages around current page
                            let pageNum;
                            if (pagination.pages <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                              pageNum = i + 1;
                            } else if (pagination.page >= pagination.pages - 2) {
                              pageNum = pagination.pages - 4 + i;
                            } else {
                              pageNum = pagination.page - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPagination({ ...pagination, page: pageNum })}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pagination.page === pageNum
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                            disabled={pagination.page >= pagination.pages}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                              pagination.page >= pagination.pages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Next</span>
                            &rarr;
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;