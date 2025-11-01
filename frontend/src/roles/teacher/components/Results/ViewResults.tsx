import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Filter, Download, Medal } from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import { useSchoolClasses } from '../../../../hooks/useSchoolClasses';
import { toast } from 'react-hot-toast';

const ViewResults: React.FC = () => {
  const { user, token } = useAuth();
  
  // Use the useSchoolClasses hook to fetch classes configured by superadmin
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

  // Get class list from superadmin configuration
  const classList = classesData?.classes?.map(c => c.className) || [];

  // Update available sections when class changes
  useEffect(() => {
    if (selectedClass && classesData) {
      const sections = getSectionsByClass(selectedClass);
      setAvailableSections(sections);
      // Don't reset selectedSection here - it's reset in the class onChange handler
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
          const resp = await fetch('/api/class-subjects/classes', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-school-code': schoolCode.toUpperCase()
            }
          });
          if (resp.ok) {
            const data = await resp.json();
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
          const resp2 = await fetch(`/api/direct-test/class-subjects/${selectedClass}?schoolCode=${schoolCode}`, {
            headers: {
              'x-school-code': schoolCode.toUpperCase()
            }
          });
          if (resp2.ok) {
            const data2 = await resp2.json();
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

    // Standard CBSE/ICSE Grading Scheme
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

  const classStats = {
    totalStudents: results.length,
    averageMarks: results.length > 0 ? Math.round(
      results.reduce((sum, student) => sum + (student.obtainedMarks || 0), 0) / results.length
    ) : 0,
    averagePercentage: results.length > 0 ? Math.round(
      results.reduce((sum, student) => {
        const percentage = student.totalMarks ? (student.obtainedMarks / student.totalMarks) * 100 : 0;
        return sum + percentage;
      }, 0) / results.length
    ) : 0,
    highestScore: results.length > 0 ? Math.max(...results.map(student => student.obtainedMarks || 0)) : 0,
    lowestScore: results.length > 0 ? Math.min(...results.map(student => student.obtainedMarks || 0)) : 0
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">View Results</h1>
          <p className="text-gray-600">Student performance reports for your subjects</p>
        </div>
        
        <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mt-4 sm:mt-0">
          <Download className="h-4 w-4 mr-2" />
          Export Results
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
                setSelectedSubject('');
                setSelectedExam('');
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
              onChange={(e) => setSelectedExam(e.target.value)}
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
                try {
                  const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
                  if (!schoolCode) {
                    toast.error('School code not available');
                    setLoading(false);
                    return;
                  }

                  const response = await fetch(
                    `/api/results/teacher/view?schoolCode=${schoolCode}&class=${selectedClass}&section=${selectedSection}&subject=${selectedSubject}&testType=${selectedExam}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );

                  if (!response.ok) {
                    throw new Error('Failed to fetch results');
                  }

                  const data = await response.json();
                  
                  if (data.success) {
                    setResults(data.data.results || []);
                    toast.success(`Found ${data.data.results.length} results`);
                  } else {
                    toast.error(data.message || 'Failed to fetch results');
                    setResults([]);
                  }
                } catch (error) {
                  console.error('Error fetching results:', error);
                  toast.error('Failed to fetch results');
                  setResults([]);
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
          <p className="text-2xl font-bold text-gray-900">{classStats.highestScore}/100</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Lowest Score</h3>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{classStats.lowestScore}/100</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Pass Rate</h3>
            <BarChart3 className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {results.length > 0 ? Math.round((results.filter(s => (s.percentage || 0) >= 40).length / results.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Existing Results for {selectedClass}-{selectedSection}
                  {selectedSubject && ` - ${selectedSubject}`}
                  {selectedExam && ` (${selectedExam})`}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Found {results.length} results.
                </p>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => {
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
                        {result.obtainedMarks}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {results.length === 0 && selectedClass && selectedSection && selectedSubject && selectedExam && (
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