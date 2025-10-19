import React, { useState, useEffect, useCallback } from 'react';
import { Search, Edit, Save, Check, X } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { testDetailsAPI } from '../../../api/testDetails';
import { resultsAPI } from '../../../services/api';
import { toast } from 'react-hot-toast';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';

interface StudentResult {
  id: string;
  name: string;
  userId: string;
  class: string;
  section: string;
  totalMarks: number | null;
  obtainedMarks: number | null;
  grade: string | null;
}

const Results: React.FC = () => {
  const { user, token } = useAuth();

  // Use the useSchoolClasses hook to fetch classes configured by superadmin
  const {
    classesData,
    loading: classesLoading,
    error: classesError,
    getClassOptions,
    getSectionsByClass,
    hasClasses
  } = useSchoolClasses();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [selectedTestType, setSelectedTestType] = useState('');
  const [maxMarks, setMaxMarks] = useState<number | ''>('');
  const [showResultsTable, setShowResultsTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [editingAll, setEditingAll] = useState(false);
  const [savedRows, setSavedRows] = useState<{ [key: string]: boolean }>({});

  // Dynamic state for test types
  const [testTypes, setTestTypes] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loadingTestTypes, setLoadingTestTypes] = useState(false);

  // State for existing results
  const [existingResults, setExistingResults] = useState<any[]>([]);
  const [loadingExistingResults, setLoadingExistingResults] = useState(false);
  const [showExistingResults, setShowExistingResults] = useState(false);

  const grades = ['A+', 'A', 'B', 'C', 'D', 'F'];

  // Get class list from superadmin configuration
  const classList = classesData?.classes?.map(c => c.className) || [];

  // Function to fetch test types for the selected class
  const fetchTestTypes = useCallback(async (className: string) => {
    if (!className) {
      setTestTypes([]);
      return;
    }

    setLoadingTestTypes(true);
    try {
      // Get the school code from localStorage or auth context
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      if (!schoolCode) {
        toast.error('School code not available');
        return;
      }

      console.log('Fetching test types for school code:', schoolCode, 'class:', className);

      const response = await testDetailsAPI.getTestDetailsBySchoolCode();

      if (response.success && response.data?.classTestTypes) {
        const classTestTypes = response.data.classTestTypes;

        // Get test types for the selected class
        const classData = classTestTypes[className];
        if (classData && Array.isArray(classData)) {
          const testTypeNames = classData.map((test: any) => test.name).filter(Boolean);
          // Remove duplicates while preserving order
          const uniqueTestTypes = [...new Set(testTypeNames)];
          setTestTypes(uniqueTestTypes);
          console.log('Test types loaded for class', className, ':', uniqueTestTypes);
        } else {
          setTestTypes([]);
          console.log('No test types found for class:', className);
        }

        // Also update available classes
        const classNames = Object.keys(classTestTypes);
        setAvailableClasses(classNames);
      } else {
        setTestTypes([]);
        console.log('No test data found for school');
      }
    } catch (error) {
      console.error('Error fetching test types:', error);
      toast.error('Failed to load test types');
      setTestTypes([]);
    } finally {
      setLoadingTestTypes(false);
    }
  }, [user?.schoolCode]);

  // Update available sections when class changes
  useEffect(() => {
    if (selectedClass && classesData) {
      const sections = getSectionsByClass(selectedClass);
      setAvailableSections(sections);
      // Auto-select first section if available
      if (sections.length > 0) {
        setSelectedSection(sections[0].value);
      } else {
        setSelectedSection('');
      }
    } else {
      setAvailableSections([]);
      setSelectedSection('');
    }
  }, [selectedClass, classesData]);

  // Fetch test types when selected class changes
  useEffect(() => {
    if (selectedClass) {
      fetchTestTypes(selectedClass);
      setSelectedTestType(''); // Reset test type when class changes
    } else {
      setTestTypes([]);
    }
  }, [selectedClass, fetchTestTypes]);

  // Fetch students from the school database
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      if (!schoolCode) {
        toast.error('School code not available');
        return;
      }

      // Fetch students from the school's student collection
      const response = await resultsAPI.getStudents(schoolCode, {
        class: selectedClass,
        section: selectedSection
      });

      if (response.data.success && response.data.data) {
        const students = response.data.data.map((student: any) => ({
          id: student._id || student.id,
          name: student.name?.displayName || student.name?.firstName + ' ' + student.name?.lastName || student.fullName || 'Unknown',
          userId: student.userId || student.user_id || 'N/A',
          class: selectedClass,
          section: selectedSection,
          totalMarks: maxMarks,
          obtainedMarks: null, // Will be filled when user enters marks
          grade: null
        }));

        setStudentResults(students);
        setShowResultsTable(true);

        // Initialize saved states
        const initialSavedState: { [key: string]: boolean } = {};
        students.forEach((student: StudentResult) => {
          initialSavedState[student.id] = false;
        });
        setSavedRows(initialSavedState);

        toast.success(`Found ${students.length} students in ${selectedClass}-${selectedSection}`);
      } else {
        setError('No students found for the selected class and section');
        setStudentResults([]);
        setShowResultsTable(false);
      }

    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError('Failed to load students. Please try again.');
      setStudentResults([]);
      setShowResultsTable(false);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection, maxMarks, user?.schoolCode]);

  // Function to fetch existing results for a class and section
  const fetchExistingResults = useCallback(async () => {
    if (!selectedClass || !selectedSection) {
      toast.error('Please select class and section first');
      return;
    }

    setLoadingExistingResults(true);
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      if (!schoolCode) {
        toast.error('School code not available');
        return;
      }

      // Call API to get existing results
      const response = await resultsAPI.getResults({
        schoolCode,
        class: selectedClass,
        section: selectedSection
      });

      if (response.data.success && response.data.data) {
        setExistingResults(response.data.data);
        setShowExistingResults(true);
        toast.success(`Found ${response.data.data.length} existing results for ${selectedClass}-${selectedSection}`);
      } else {
        setExistingResults([]);
        setShowExistingResults(false);
        toast.info('No existing results found for this class and section');
      }
    } catch (error: any) {
      console.error('Error fetching existing results:', error);
      toast.error('Failed to load existing results');
      setExistingResults([]);
      setShowExistingResults(false);
    } finally {
      setLoadingExistingResults(false);
    }
  }, [selectedClass, selectedSection, user?.schoolCode]);

  // Function to edit existing result
  const editExistingResult = (result: any) => {
    // Convert existing result to student result format
    const studentResult: StudentResult = {
      id: result.studentId,
      name: result.studentName,
      userId: result.userId,
      class: result.className,
      section: result.section,
      totalMarks: result.totalMarks,
      obtainedMarks: result.obtainedMarks,
      grade: result.grade
    };

    // Set the student results with the existing data
    setStudentResults([studentResult]);
    setShowResultsTable(true);
    setShowExistingResults(false);

    // Set the form values
    setSelectedTestType(result.testType);
    setMaxMarks(result.totalMarks);

    // Enable edit mode
    setEditingAll(true);

    toast.success('Loaded existing result for editing');
  };

  const handleSearch = () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    if (!selectedSection) {
      toast.error('Please select a section');
      return;
    }
    if (!selectedTestType) {
      toast.error('Please select a test type');
      return;
    }
    if (!maxMarks || maxMarks <= 0) {
      toast.error('Please enter valid max marks');
      return;
    }

    fetchStudents();
  };

  const handleEditAll = () => {
    setEditingAll(true);
    // Reset all saved states when starting edit all
    const resetSavedState: { [key: string]: boolean } = {};
    studentResults.forEach(student => {
      resetSavedState[student.id] = false;
    });
    setSavedRows(resetSavedState);
  };

  const handleSaveAll = async () => {
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      if (!schoolCode) {
        toast.error('School code not available');
        return;
      }

      // Filter out students with no obtained marks
      const validResults = studentResults.filter(student =>
        student.obtainedMarks !== null && student.obtainedMarks !== undefined
      );

      if (validResults.length === 0) {
        toast.error('Please enter obtained marks for at least one student');
        return;
      }

      // Prepare results data for API
      const resultsData = {
        schoolCode,
        class: selectedClass,
        section: selectedSection,
        testType: selectedTestType,
        maxMarks: maxMarks,
        academicYear: '2024-25', // You might want to make this dynamic
        results: validResults.map(student => ({
          studentId: student.id,
          studentName: student.name,
          userId: student.userId,
          obtainedMarks: student.obtainedMarks,
          totalMarks: student.totalMarks,
          grade: student.grade
        }))
      };

      console.log('Saving results:', resultsData);

      const response = await resultsAPI.saveResults(resultsData);

      if (response.data.success) {
        toast.success(`Successfully saved results for ${validResults.length} students`);

        // Mark all rows as saved
        const allSavedState: { [key: string]: boolean } = {};
        studentResults.forEach(student => {
          allSavedState[student.id] = true;
        });
        setSavedRows(allSavedState);
        setEditingAll(false);
      } else {
        toast.error(response.data.message || 'Failed to save results');
      }

    } catch (error: any) {
      console.error('Error saving results:', error);
      toast.error('Failed to save results. Please try again.');
    }
  };

  const updateStudentResult = (studentId: string, field: keyof StudentResult, value: any) => {
    setStudentResults(prev =>
      prev.map(student =>
        student.id === studentId
          ? { ...student, [field]: value }
          : student
      )
    );

    // Mark this row as unsaved
    setSavedRows(prev => ({ ...prev, [studentId]: false }));
  };

  const calculateGrade = (obtained: number | null, total: number | null): string => {
    if (!obtained || !total || total === 0) return 'N/A';

    const percentage = (obtained / total) * 100;

    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  // Auto-calculate grade when marks change
  useEffect(() => {
    setStudentResults(prev =>
      prev.map(student => ({
        ...student,
        grade: calculateGrade(student.obtainedMarks, student.totalMarks)
      }))
    );
  }, [studentResults.map(s => `${s.obtainedMarks}-${s.totalMarks}`).join(',')]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Academic Results</h1>
        {showResultsTable && (
          <div className="flex space-x-3">
            {!editingAll ? (
              <button
                onClick={handleEditAll}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit All
              </button>
            ) : (
              <button
                onClick={handleSaveAll}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          {/* Class Selection */}
          <div className="flex flex-col">
            <label htmlFor="class-select" className="text-sm font-medium text-gray-700">Class</label>
            <select
              id="class-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
              disabled={classesLoading || !hasClasses()}
            >
              <option value="">{classesLoading ? 'Loading...' : 'Select Class'}</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
            {!classesLoading && !hasClasses() && (
              <span className="text-xs text-red-500 mt-1">No classes configured</span>
            )}
          </div>

          {/* Section Selection */}
          <div className="flex flex-col">
            <label htmlFor="section-select" className="text-sm font-medium text-gray-700">Section</label>
            <select
              id="section-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
              disabled={!selectedClass || availableSections.length === 0}
            >
              <option value="">{!selectedClass ? 'Select Class First' : 'Select Section'}</option>
              {availableSections.map((section) => (
                <option key={section.value} value={section.value}>Section {section.section}</option>
              ))}
            </select>
          </div>

          {/* Test Type Selection */}
          <div className="flex flex-col">
            <label htmlFor="test-type-select" className="text-sm font-medium text-gray-700">Test Type</label>
            <select
              id="test-type-select"
              value={selectedTestType}
              onChange={(e) => setSelectedTestType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
              disabled={!selectedClass || loadingTestTypes}
            >
              <option value="">
                {!selectedClass
                  ? 'Select Class First'
                  : loadingTestTypes
                    ? 'Loading...'
                    : 'Select Test'}
              </option>
              {testTypes.map((type, index) => (
                <option key={`${type}-${index}`} value={type}>{type}</option>
              ))}
            </select>
            {!selectedClass && (
              <span className="text-xs text-gray-500 mt-1">Select a class to see available tests</span>
            )}
          </div>

          {/* Max Marks Input */}
          <div className="flex flex-col">
            <label htmlFor="max-marks-input" className="text-sm font-medium text-gray-700">Max Marks</label>
            <input
              id="max-marks-input"
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(parseInt(e.target.value) || '')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
              placeholder="Enter max marks"
              min="1"
              max="1000"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors self-end"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </button>

          {/* View Existing Results Button */}
          <button
            onClick={fetchExistingResults}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors self-end"
            disabled={loadingExistingResults || !selectedClass || !selectedSection}
          >
            {loadingExistingResults ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            View Existing Results
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Existing Results Table */}
      {showExistingResults && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Existing Results for {selectedClass}-{selectedSection}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Found {existingResults.length} results. Click on a result to edit it.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obtained Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {existingResults.map((result, index) => (
                  <tr key={result._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.testType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.obtainedMarks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.totalMarks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${result.grade === 'A+' ? 'bg-green-100 text-green-800' :
                        result.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                          result.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                            result.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                              result.grade === 'D' ? 'bg-red-100 text-red-800' :
                                result.grade === 'F' ? 'bg-red-200 text-red-900' :
                                  'bg-gray-100 text-gray-800'
                        }`}>
                        {result.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => editExistingResult(result)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Table */}
      {showResultsTable && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obtained Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentResults.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingAll ? (
                        <input
                          type="number"
                          value={student.totalMarks || ''}
                          onChange={(e) => updateStudentResult(student.id, 'totalMarks', parseInt(e.target.value) || null)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Total"
                        />
                      ) : (
                        student.totalMarks || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingAll ? (
                        <input
                          type="number"
                          value={student.obtainedMarks || ''}
                          onChange={(e) => updateStudentResult(student.id, 'obtainedMarks', parseInt(e.target.value) || null)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Obtained"
                        />
                      ) : (
                        student.obtainedMarks || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${student.grade === 'A+' ? 'bg-green-100 text-green-800' :
                        student.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                          student.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                            student.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                              student.grade === 'D' ? 'bg-red-100 text-red-800' :
                                student.grade === 'F' ? 'bg-red-200 text-red-900' :
                                  'bg-gray-100 text-gray-800'
                        }`}>
                        {student.grade || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;
