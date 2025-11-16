import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Filter, Download, Medal, Edit, Save, X, Search } from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import { useSchoolClasses } from '../../../../hooks/useSchoolClasses';
import { useAcademicYear } from '../../../../contexts/AcademicYearContext';
import { resultsAPI } from '../../../../services/api';
import api from '../../../../services/api';
import { toast } from 'react-hot-toast';

const ViewResults: React.FC = () => {
  const { user, token } = useAuth();
  const { currentAcademicYear } = useAcademicYear();

  // Use the useSchoolClasses hook
  const {
    classesData,
    loading: classesLoading,
    getClassOptions,
    getSectionsByClass
  } = useSchoolClasses();

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTestTypes, setLoadingTestTypes] = useState(false);

  // State for client-side search
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State for inline editing
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editingMarks, setEditingMarks] = useState<number | null>(null);
  const [savingResultId, setSavingResultId] = useState<string | null>(null);

  // State for freeze functionality
  const [isFrozen, setIsFrozen] = useState(false);

  const classList = classesData?.classes?.map(c => c.className) || [];

  // Update available sections when class changes
  useEffect(() => {
    if (selectedClass && classesData) {
      const sections = getSectionsByClass(selectedClass);
      setAvailableSections(sections);
    } else {
      setAvailableSections([]);
      setSelectedSection('');
      setSelectedSubject('');
      setSubjects([]);
      setSelectedExam('');
      setExamTypes([]);
    }
  }, [selectedClass, classesData, getSectionsByClass]);

  // Fetch test types when class is selected
  const fetchTestTypes = useCallback(async (className: string) => {
    if (!className) {
      setExamTypes([]);
      return;
    }
    setLoadingTestTypes(true);
    try {
      if (classesData && classesData.testsByClass) {
        let classTests = classesData.testsByClass[className] || [];
        if (classTests.length === 0 && classesData.tests) {
          classTests = classesData.tests.filter((t: any) => String(t.className) === String(className));
        }
        const withMarks = classTests.filter((t: any) => typeof t?.maxMarks === 'number' && t.maxMarks > 0);
        if (withMarks.length > 0) {
          const names = withMarks
            .map((t: any) => t.testName || t.displayName || t.name || t.testType)
            .filter(Boolean);
          const unique = [...new Set(names)];
          setExamTypes(unique);
          setLoadingTestTypes(false);
          return;
        }
      }
      setExamTypes([]);
    } catch (error) {
      console.error('Error fetching test types:', error);
      toast.error('Failed to load test types');
      setExamTypes([]);
    } finally {
      setLoadingTestTypes(false);
    }
  }, [classesData]);

  // Fetch test types when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchTestTypes(selectedClass);
    } else {
      setExamTypes([]);
    }
  }, [selectedClass, fetchTestTypes]);

  // Fetch subjects when class and section are selected
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedClass || !selectedSection) {
        setSubjects([]);
        setSelectedSubject('');
        return;
      }
      setLoadingSubjects(true);
      try {
        const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
        if (!schoolCode) {
          toast.error('School code not available');
          return;
        }
        // Primary API
        try {
          const resp = await api.get('/class-subjects/classes');
          const data = resp.data;
          if (data && data.success) {
            const classData = data?.data?.classes?.find((c: any) => c.className === selectedClass && c.section === selectedSection);
            const activeSubjects = (classData?.subjects || []).filter((s: any) => s.isActive !== false);
            const subjectNames = activeSubjects.map((s: any) => s.name).filter(Boolean);
            setSubjects(subjectNames);
            setSelectedSubject('');
            return;
          }
        } catch (_) {
          // fall through to fallback
        }
        // Fallback API
        try {
          const resp2 = await api.get(`/direct-test/class-subjects/${selectedClass}?schoolCode=${schoolCode}`);
          const data2 = resp2.data;
          if (data2 && data2.success) {
            const subjectNames = (data2?.data?.subjects || []).map((s: any) => s.name).filter(Boolean);
            setSubjects(subjectNames);
            setSelectedSubject('');
            return;
          }
        } catch (_) {
          // ignore
        }
        setSubjects([]);
        setSelectedSubject('');
        toast.error('No subjects found for selected class and section');
      } catch (err) {
        console.error('Error fetching subjects:', err);
        toast.error('Failed to load subjects');
        setSubjects([]);
        setSelectedSubject('');
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [selectedClass, selectedSection, token, user?.schoolCode]);

  const calculateGrade = (obtained: number | null, total: number | null): string => {
    if (obtained === null || obtained === undefined || !total || total === 0) return 'N/A';
    const percentage = (obtained / total) * 100;
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    if (percentage >= 21) return 'E1';
    return 'E2';
  };

  const getGradeColor = (grade: string) => {
    if (['A1', 'A2'].includes(grade)) return 'bg-green-100 text-green-800';
    if (['B1', 'B2'].includes(grade)) return 'bg-blue-100 text-blue-800';
    if (['C1', 'C2'].includes(grade)) return 'bg-yellow-100 text-yellow-800';
    if (grade === 'D') return 'bg-orange-100 text-orange-800';
    if (['E1', 'E2'].includes(grade)) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-600';
  };

  const startInlineEdit = (result: any) => {
    if (isFrozen) {
      toast.error('Results are frozen and cannot be edited');
      return;
    }
    setEditingResultId(result._id || result.id);
    setEditingMarks(result.obtainedMarks);
  };

  const cancelInlineEdit = () => {
    setEditingResultId(null);
    setEditingMarks(null);
  };

  const saveInlineEdit = async (result: any) => {
    if (editingMarks === null || editingMarks === undefined) {
      toast.error('Please enter valid marks');
      return;
    }
    const totalMarks = result.totalMarks || result.maxMarks;
    if (editingMarks > totalMarks) {
      toast.error(`Marks cannot exceed ${totalMarks}`);
      return;
    }
    if (editingMarks < 0) {
      toast.error('Marks cannot be negative');
      return;
    }
    const resultId = result._id || result.id;
    setSavingResultId(resultId);
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
      await resultsAPI.updateResult(resultId, {
        schoolCode,
        class: result.className || selectedClass,
        section: result.section || selectedSection,
        subject: result.subject || selectedSubject,
        testType: result.testType || selectedExam,
        maxMarks: result.maxMarks || totalMarks,
        obtainedMarks: editingMarks,
        totalMarks: totalMarks,
        studentId: result.studentId,
        studentName: result.studentName,
        userId: result.userId
      });
      const updatedGrade = calculateGrade(editingMarks, totalMarks);
      setResults(prev =>
        prev.map(r => {
          const rId = r._id || r.id;
          return rId === resultId
            ? { ...r, obtainedMarks: editingMarks, grade: updatedGrade }
            : r;
        })
      );
      setEditingResultId(null);
      setEditingMarks(null);
      toast.success('Result updated successfully!');
    } catch (error: any) {
      console.error('Error updating result:', error);
      toast.error(error.response?.data?.message || 'Failed to update result');
    } finally {
      setSavingResultId(null);
    }
  };

  // Client-side filtering logic
  const filteredStudents = useMemo(() => {
    if (!searchTerm) {
      return results;
    }
    const lowerSearch = searchTerm.toLowerCase();
    return results.filter(result =>
      result.studentName?.toLowerCase().includes(lowerSearch) ||
      result.userId?.toLowerCase().includes(lowerSearch) ||
      result.rollNumber?.toLowerCase().includes(lowerSearch)
    );
  }, [results, searchTerm]);

  // Statistics now use filteredStudents
  const classStats = {
    totalStudents: filteredStudents.length,
    averageMarks: filteredStudents.length > 0 ? Math.round(
      filteredStudents.reduce((sum, student) => sum + (student.obtainedMarks || 0), 0) / filteredStudents.length
    ) : 0,
    averagePercentage: filteredStudents.length > 0 ? Math.round(
      filteredStudents.reduce((sum, student) => {
        const percentage = student.totalMarks ? (student.obtainedMarks / student.totalMarks) * 100 : 0;
        return sum + percentage;
      }, 0) / filteredStudents.length
    ) : 0,
    highestScore: filteredStudents.length > 0 ? Math.max(...filteredStudents.map(student => student.obtainedMarks || 0)) : 0,
    lowestScore: filteredStudents.length > 0 ? Math.min(...filteredStudents.map(student => student.obtainedMarks || 0)) : 0,
    passRate: filteredStudents.length > 0 ? Math.round((filteredStudents.filter(s => {
      const total = s.totalMarks || s.maxMarks;
      if (!total) return false;
      const percentage = (s.obtainedMarks / total) * 100;
      return percentage >= 33; // Assuming 33 is pass mark
    }).length / filteredStudents.length) * 100) : 0
  };

  // Function to handle CSV export
  const handleExport = () => {
    if (filteredStudents.length === 0) {
      toast.error('No data to export.');
      return;
    }

    const headers = ['User ID', 'Student Name', 'Subject', 'Test Type', 'Obtained Marks', 'Total Marks', 'Grade', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredStudents.map(s =>
        [
          s.userId || '-',
          `"${s.studentName || s.name}"`,
          s.subject || selectedSubject,
          s.testType || selectedExam,
          s.obtainedMarks,
          s.totalMarks || s.maxMarks,
          calculateGrade(s.obtainedMarks, s.totalMarks || s.maxMarks),
          s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    const fileName = `Results_${selectedClass}-${selectedSection}_${selectedSubject}_${selectedExam}.csv`;

    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Results exported!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">View Results</h1>
          <p className="text-gray-600">Student performance reports for your subjects</p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mt-4 sm:mt-0"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Results
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
            <input
              type="text"
              value={currentAcademicYear || 'Loading...'}
              readOnly
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-semibold cursor-not-allowed"
              title="Academic Year is set by Admin and cannot be changed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
                setSelectedSubject('');
                setSelectedExam('');
                setResults([]); // Clear results on change
                setSearchTerm(''); // Clear search
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Class</option>
              {classList.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedSubject('');
                setSelectedExam('');
                setResults([]); // Clear results on change
                setSearchTerm(''); // Clear search
              }}
              disabled={!selectedClass}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Section</option>
              {selectedClass && availableSections.map(section => (
                <option key={section.value} value={section.value}>{section.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedExam('');
                setResults([]); // Clear results on change
                setSearchTerm(''); // Clear search
              }}
              disabled={!selectedSection}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Subject</option>
              {selectedSection && subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Exam Type</label>
            <select
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                setResults([]); // Clear results on change
                setSearchTerm(''); // Clear search
              }}
              disabled={!selectedSubject}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Exam Type</option>
              {selectedSubject && examTypes.map(exam => (
                <option key={exam} value={exam}>{exam}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              className="w-full px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={!selectedClass || !selectedSection || !selectedSubject || !selectedExam || loading}
              onClick={async () => {
                setLoading(true);
                setSearchTerm(''); // Clear search on new fetch
                try {
                  const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
                  if (!schoolCode) {
                    toast.error('School code not available');
                    setLoading(false);
                    return;
                  }

                  console.log('🔍 [Teacher View] Fetching results with params:', {
                    schoolCode,
                    class: selectedClass,
                    section: selectedSection,
                    subject: selectedSubject,
                    testType: selectedExam,
                    academicYear: currentAcademicYear
                  });

                  const response = await resultsAPI.getResultsForTeacher({
                    schoolCode,
                    class: selectedClass,
                    section: selectedSection,
                    subject: selectedSubject,
                    testType: selectedExam,
                    academicYear: currentAcademicYear
                  });

                  if (response.data.success && response.data.data) {
                    const payload = response.data.data;
                    const resultsData = payload.results || [];

                    const firstResult = resultsData[0];
                    const frozen = firstResult?.frozen || false;
                    setIsFrozen(frozen);

                    const formattedResults = resultsData.map((r: any) => ({
                      ...r,
                      id: r._id || r.id,
                      studentName: r.studentName || r.name,
                      obtainedMarks: r.obtainedMarks,
                      totalMarks: r.totalMarks || r.maxMarks,
                      grade: calculateGrade(r.obtainedMarks, r.totalMarks || r.maxMarks)
                    }));

                    setResults(formattedResults);

                    if (frozen) {
                      toast.error(
                        `⚠️ Results are FROZEN and cannot be edited. Loaded ${formattedResults.length} result(s).`,
                        { duration: 5000 }
                      );
                    } else {
                      toast.success(`Found ${formattedResults.length} results`);
                    }
                  } else {
                    toast.error('No results found for the selected filters');
                    setResults([]);
                    setIsFrozen(false);
                  }
                } catch (error: any) {
                  console.error('Error fetching results for teacher:', error);
                  toast.error(error.response?.data?.message || 'Failed to fetch results');
                  setResults([]);
                  setIsFrozen(false);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Students</h3>
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{classStats.totalStudents}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Class Average</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{classStats.averagePercentage}%</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Highest Score</h3>
            <Medal className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{classStats.highestScore}/{results[0]?.totalMarks || results[0]?.maxMarks || 'N/A'}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Lowest Score</h3>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{classStats.lowestScore}/{results[0]?.totalMarks || results[0]?.maxMarks || 'N/A'}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Pass Rate</h3>
            <BarChart3 className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{classStats.passRate}%</p>
        </div>
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Existing Results for {selectedClass}-{selectedSection}
                  {selectedSubject && ` - ${selectedSubject}`}
                  {selectedExam && ` (${selectedExam})`}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {filteredStudents.length} of {results.length} results.
                </p>
              </div>
              <div className="relative w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Type
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
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((result, index) => {
                  const grade = calculateGrade(result.obtainedMarks, result.totalMarks || result.maxMarks);
                  return (
                    <tr key={result.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.userId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.studentName || result.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                          {result.subject || selectedSubject || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
                          {result.testType || selectedExam}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {editingResultId === (result._id || result.id) ? (
                          <input
                            type="number"
                            value={editingMarks || ''}
                            onChange={(e) => setEditingMarks(e.target.value === '' ? null : Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max={result.totalMarks || result.maxMarks}
                            disabled={savingResultId === (result._id || result.id)}
                          />
                        ) : (
                          result.obtainedMarks
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.totalMarks || result.maxMarks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getGradeColor(grade)}`}>
                          {grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.createdAt ? new Date(result.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingResultId === (result._id || result.id) ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => saveInlineEdit(result)}
                              disabled={savingResultId === (result._id || result.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              {savingResultId === (result._id || result.id) ? (
                                <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              disabled={savingResultId === (result._id || result.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startInlineEdit(result)}
                            disabled={isFrozen || result.frozen}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={isFrozen || result.frozen ? "Results are frozen" : "Edit marks"}
                          >
                            {isFrozen || result.frozen ? (
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <Edit className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {results.length === 0 && selectedClass && selectedSection && selectedSubject && selectedExam && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No results available</p>
            <p className="text-sm mt-2">No results found for the selected filters</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewResults;