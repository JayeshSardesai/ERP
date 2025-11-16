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
  const [testMaxMarks, setTestMaxMarks] = useState<number | null>(null);
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
  const [savingAll, setSavingAll] = useState(false);
  const [freezing, setFreezing] = useState(false);

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

  useEffect(() => {
    if (!selectedClass || !selectedExam || !classesData) {
      setTestMaxMarks(null);
      return;
    }

    let classTests: any[] = (classesData as any).testsByClass?.[selectedClass] || (classesData as any).tests || [];
    if (!Array.isArray(classTests)) {
      classTests = [];
    }

    const match = classTests.find((t: any) => {
      const name = t.testName || t.displayName || t.name || t.testType;
      return String(name) === String(selectedExam);
    });

    if (match && typeof match.maxMarks === 'number') {
      setTestMaxMarks(match.maxMarks);
    } else {
      setTestMaxMarks(null);
    }
  }, [selectedClass, selectedExam, classesData]);

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
    if (isFrozen || result.frozen) {
      toast.error('Results are frozen and cannot be edited');
      return;
    }
    // Use resultId when available to ensure we target the result document, not the student document
    setEditingResultId(result.resultId || result._id || result.id);
    setEditingMarks(result.obtainedMarks);
  };

  const cancelInlineEdit = () => {
    setEditingResultId(null);
    setEditingMarks(null);
  };

  const updateResultMarks = (rowKey: string, value: number | null) => {
    setResults(prev =>
      prev.map(r => {
        const key = String(r.id || r.studentId || r._id || '');
        if (key === rowKey) {
          return {
            ...r,
            obtainedMarks: value
          };
        }
        return r;
      })
    );
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
    const resultId = result.resultId || result._id || result.id;

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
          const rId = r.resultId || r._id || r.id;
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

  const handleSaveAll = async () => {
    if (!selectedClass || !selectedSection || !selectedSubject || !selectedExam) {
      toast.error('Please select class, section, subject and exam type');
      return;
    }

    if (!testMaxMarks || testMaxMarks <= 0) {
      toast.error('Configured max marks not found for this test. Please ask Admin to configure.');
      return;
    }

    const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
    if (!schoolCode) {
      toast.error('School code not available');
      return;
    }

    const validResults = results.filter(r =>
      r.obtainedMarks !== null && r.obtainedMarks !== undefined
    );

    if (validResults.length === 0) {
      toast.error('Please enter obtained marks for at least one student');
      return;
    }

    setSavingAll(true);
    try {
      const payload = {
        schoolCode,
        class: selectedClass,
        section: selectedSection,
        testType: selectedExam,
        subject: selectedSubject,
        maxMarks: testMaxMarks,
        academicYear: currentAcademicYear,
        results: validResults.map((r: any) => {
          const totalMarks = r.totalMarks || r.maxMarks || testMaxMarks;
          const grade = calculateGrade(r.obtainedMarks, totalMarks);
          return {
            studentId: r.studentId || r.id,
            studentName: r.studentName || r.name,
            userId: r.userId,
            obtainedMarks: r.obtainedMarks,
            totalMarks,
            grade
          };
        })
      };

      console.log('[Teacher Results] Saving results payload:', payload);

      const resp = await resultsAPI.saveResults(payload);
      if (!resp.data?.success) {
        toast.error(resp.data?.message || 'Failed to save results');
        return;
      }

      toast.success(`Saved ${validResults.length} result(s)`);

      // Refresh list so that newly saved marks appear as existing results with Edit actions
      try {
        const refreshedSchoolCode = schoolCode;
        const response = await resultsAPI.getResultsForTeacher({
          schoolCode: refreshedSchoolCode,
          class: selectedClass,
          section: selectedSection,
          subject: selectedSubject,
          testType: selectedExam,
          academicYear: currentAcademicYear
        });

        if (response.data.success && response.data.data) {
          const payload = response.data.data;
          const resultsData: any[] = Array.isArray(payload.results) ? payload.results : [];

          const byUserId = new Map<string, any>();
          const byStudentId = new Map<string, any>();

          resultsData.forEach((r: any) => {
            const uid = (r.userId || '').toString().trim();
            const sid = (r.studentId || '').toString().trim();
            if (uid) {
              byUserId.set(uid, r);
            }
            if (sid) {
              byStudentId.set(sid, r);
            }
          });

          const merged = results.map(student => {
            const uidKey = (student.userId || '').toString().trim();
            const sidKey = (student.studentId || student.id || '').toString().trim();

            const r =
              (uidKey && byUserId.get(uidKey)) ||
              (sidKey && byStudentId.get(sidKey)) ||
              null;

            const totalMarks =
              (r && (r.totalMarks || r.maxMarks)) ||
              student.totalMarks ||
              testMaxMarks ||
              null;

            const obtainedMarks =
              r && r.obtainedMarks !== null && r.obtainedMarks !== undefined
                ? r.obtainedMarks
                : student.obtainedMarks ?? null;

            const grade =
              obtainedMarks !== null && totalMarks
                ? calculateGrade(obtainedMarks, totalMarks)
                : 'N/A';

            return {
              ...student,
              ...r,
              id: r?._id || r?.id || student.id,
              _id: r?._id || student._id,
              studentId: student.studentId || r?.studentId,
              studentName: student.studentName || r?.studentName || r?.name,
              className: selectedClass,
              section: selectedSection,
              subject: selectedSubject,
              testType: selectedExam,
              totalMarks,
              maxMarks: totalMarks,
              obtainedMarks,
              grade,
              frozen: r?.frozen || false
            };
          });

          const frozen = merged.some(r => r.frozen);
          setIsFrozen(frozen);
          setResults(merged);
        }
      } catch (refreshError) {
        console.error('Error refreshing results after save (teacher):', refreshError);
      }
    } catch (error: any) {
      console.error('Error saving results (teacher):', error);
      toast.error(error.response?.data?.message || 'Failed to save results. Please try again.');
    } finally {
      setSavingAll(false);
    }
  };

  const handleFreezeResults = async () => {
    if (!selectedClass || !selectedSection || !selectedSubject || !selectedExam) {
      toast.error('Please ensure all filters are selected');
      return;
    }

    if (results.length === 0) {
      toast.error('No results to freeze');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to FREEZE results for ${selectedClass}-${selectedSection}, ${selectedSubject} (${selectedExam})?\n\nOnce frozen, marks CANNOT be edited anymore!`
    );

    if (!confirmed) return;

    setFreezing(true);
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
      if (!schoolCode) {
        toast.error('School code not available');
        return;
      }

      await resultsAPI.freezeResults({
        schoolCode,
        class: selectedClass,
        section: selectedSection,
        subject: selectedSubject,
        testType: selectedExam,
        academicYear: currentAcademicYear
      });

      setIsFrozen(true);
      setResults(prev => prev.map(r => ({ ...r, frozen: true })));

      toast.success('Results frozen successfully! Marks can no longer be edited.');
    } catch (error: any) {
      console.error('Error freezing results (teacher):', error);
      toast.error(error.response?.data?.message || 'Failed to freeze results');
    } finally {
      setFreezing(false);
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
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 sm:mt-0">
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </button>
          {results.length > 0 && (
            <>
              <button
                onClick={handleSaveAll}
                disabled={savingAll || isFrozen}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {savingAll ? 'Saving...' : 'Save All Changes'}
              </button>
              <button
                onClick={handleFreezeResults}
                disabled={freezing || isFrozen}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {freezing ? 'Freezing...' : 'Freeze Results'}
              </button>
            </>
          )}
        </div>
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

                  const upperSchoolCode = schoolCode.toUpperCase();

                  let baseStudents: any[] = [];

                  try {
                    const studentsResponse = await resultsAPI.getStudents(upperSchoolCode, {
                      class: selectedClass,
                      section: selectedSection
                    });

                    const rawStudents: any[] = studentsResponse?.data?.data || [];

                    const filteredStudents = rawStudents.filter((s: any) => {
                      const sClass = s.academicInfo?.class ||
                        s.studentDetails?.academic?.currentClass ||
                        s.studentDetails?.currentClass ||
                        s.studentDetails?.class ||
                        s.currentclass ||
                        s.class ||
                        s.className;

                      const sSection = s.academicInfo?.section ||
                        s.studentDetails?.academic?.currentSection ||
                        s.studentDetails?.currentSection ||
                        s.studentDetails?.section ||
                        s.currentsection ||
                        s.section;

                      const studentAcademicYear = s.studentDetails?.academicYear ||
                        s.studentDetails?.academic?.academicYear ||
                        s.academicYear ||
                        s.academicInfo?.academicYear;

                      const matchesAcademicYear =
                        !currentAcademicYear ||
                        !studentAcademicYear ||
                        String(studentAcademicYear).trim() === String(currentAcademicYear).trim();

                      return (
                        String(sClass).trim() === String(selectedClass).trim() &&
                        String(sSection || '').trim().toUpperCase() === String(selectedSection).trim().toUpperCase() &&
                        matchesAcademicYear
                      );
                    });

                    baseStudents = filteredStudents.map((s: any) => ({
                      id: s._id || s.id,
                      _id: s._id || s.id,
                      studentId: s._id || s.id,
                      studentName:
                        s.name?.displayName ||
                        `${s.name?.firstName || ''} ${s.name?.lastName || ''}`.trim() ||
                        s.fullName ||
                        'Unknown',
                      userId: s.userId || s.user_id || '',
                      rollNumber:
                        s.studentDetails?.rollNumber ||
                        s.studentDetails?.currentRollNumber ||
                        s.rollNumber ||
                        s.sequenceId ||
                        '',
                      className: selectedClass,
                      section: selectedSection,
                      totalMarks: testMaxMarks,
                      maxMarks: testMaxMarks,
                      obtainedMarks: null,
                      grade: 'N/A',
                      frozen: false
                    }));
                  } catch (err) {
                    console.error('Error fetching students for teacher results:', err);
                  }

                  console.log('🔍 [Teacher View] Fetching results with params:', {
                    schoolCode,
                    class: selectedClass,
                    section: selectedSection,
                    subject: selectedSubject,
                    testType: selectedExam,
                    academicYear: currentAcademicYear
                  });

                  try {
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
                      const resultsData: any[] = Array.isArray(payload.results) ? payload.results : [];

                      const byUserId = new Map<string, any>();
                      const byStudentId = new Map<string, any>();

                      resultsData.forEach((r: any) => {
                        const uid = (r.userId || '').toString().trim();
                        const sid = (r.studentId || '').toString().trim();
                        if (uid) {
                          byUserId.set(uid, r);
                        }
                        if (sid) {
                          byStudentId.set(sid, r);
                        }
                      });

                      const merged = baseStudents.map(student => {
                        const uidKey = (student.userId || '').toString().trim();
                        const sidKey = (student.studentId || student.id || '').toString().trim();

                        const r =
                          (uidKey && byUserId.get(uidKey)) ||
                          (sidKey && byStudentId.get(sidKey)) ||
                          null;

                        const totalMarks =
                          (r && (r.totalMarks || r.maxMarks)) ||
                          student.totalMarks ||
                          testMaxMarks ||
                          null;

                        const obtainedMarks =
                          r && r.obtainedMarks !== null && r.obtainedMarks !== undefined
                            ? r.obtainedMarks
                            : null;

                        const grade =
                          obtainedMarks !== null && totalMarks
                            ? calculateGrade(obtainedMarks, totalMarks)
                            : 'N/A';

                        return {
                          ...student,
                          ...r,
                          id: r?._id || r?.id || student.id,
                          _id: r?._id || student._id,
                          studentId: student.studentId || r?.studentId,
                          studentName: student.studentName || r?.studentName || r?.name,
                          className: selectedClass,
                          section: selectedSection,
                          subject: selectedSubject,
                          testType: selectedExam,
                          totalMarks,
                          maxMarks: totalMarks,
                          obtainedMarks,
                          grade,
                          frozen: r?.frozen || false
                        };
                      });

                      const existingKeys = new Set(
                        merged.map(m => (m.userId || m.studentId || m.id || '').toString())
                      );

                      resultsData.forEach((r: any) => {
                        const key = (r.userId || r.studentId || r.id || r._id || '').toString();
                        if (!key || existingKeys.has(key)) return;

                        const totalMarks = r.totalMarks || r.maxMarks || testMaxMarks || null;
                        const obtainedMarks =
                          r.obtainedMarks !== null && r.obtainedMarks !== undefined
                            ? r.obtainedMarks
                            : null;
                        const grade =
                          obtainedMarks !== null && totalMarks
                            ? calculateGrade(obtainedMarks, totalMarks)
                            : 'N/A';

                        merged.push({
                          ...r,
                          id: r._id || r.id,
                          _id: r._id || r.id,
                          studentId: r.studentId,
                          studentName: r.studentName || r.name,
                          className: selectedClass,
                          section: selectedSection,
                          subject: selectedSubject,
                          testType: selectedExam,
                          totalMarks,
                          maxMarks: totalMarks,
                          obtainedMarks,
                          grade,
                          frozen: r.frozen || false
                        });
                      });

                      const frozen = merged.some(r => r.frozen);
                      setIsFrozen(frozen);
                      setResults(merged);

                      if (merged.length === 0) {
                        toast.error('No results found for the selected filters');
                      } else if (frozen) {
                        toast.error(
                          `⚠️ Results are FROZEN and cannot be edited. Loaded ${merged.length} student(s).`,
                          { duration: 5000 }
                        );
                      } else {
                        toast.success(
                          `Loaded ${merged.length} students for ${selectedClass}-${selectedSection}`
                        );
                      }
                    } else {
                      setIsFrozen(false);
                      setResults(baseStudents);

                      if (baseStudents.length === 0) {
                        toast.error('No students found for the selected filters');
                      } else {
                        toast.success(
                          `Loaded ${baseStudents.length} students for ${selectedClass}-${selectedSection}`
                        );
                      }
                    }
                  } catch (error: any) {
                    console.error('Error fetching results for teacher:', error);
                    setResults(baseStudents);
                    setIsFrozen(false);

                    if (baseStudents.length === 0) {
                      toast.error(error.response?.data?.message || 'Failed to fetch results');
                    } else {
                      toast.error(
                        error.response?.data?.message ||
                        'Failed to fetch results. Showing students without marks.'
                      );
                    }
                  }
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
                    Total Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obtained Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((result, index) => {
                  const grade = calculateGrade(result.obtainedMarks, result.totalMarks || result.maxMarks);
                  const rowKey = String(result.id || result.studentId || result._id || index);
                  const hasExistingResult = Boolean(result._id || result.resultId);
                  const isEditingThis = editingResultId === (result.resultId || result._id || result.id);
                  const isNewRow = !hasExistingResult;
                  const totalMarks = result.totalMarks || result.maxMarks || testMaxMarks || undefined;

                  return (
                    <tr key={result.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.userId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.studentName || result.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {totalMarks || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {isFrozen || result.frozen ? (
                          result.obtainedMarks ?? 'N/A'
                        ) : isNewRow ? (
                          <input
                            type="number"
                            value={result.obtainedMarks ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const parsed = value === '' ? null : Number(value);
                              if (parsed !== null) {
                                if (parsed < 0) return;
                                if (totalMarks && parsed > totalMarks) return;
                              }
                              updateResultMarks(rowKey, parsed);
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max={totalMarks}
                          />
                        ) : isEditingThis ? (
                          <input
                            type="number"
                            value={editingMarks ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const parsed = value === '' ? null : Number(value);
                              if (parsed !== null) {
                                if (parsed < 0) return;
                                if (totalMarks && parsed > totalMarks) return;
                              }
                              setEditingMarks(parsed);
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max={totalMarks}
                            disabled={savingResultId === (result.resultId || result._id || result.id)}
                          />
                        ) : (
                          result.obtainedMarks ?? 'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getGradeColor(grade)}`}>
                          {grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isNewRow ? (
                          <span className="text-gray-400 text-xs">Save all to create result</span>
                        ) : isEditingThis ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => saveInlineEdit(result)}
                              disabled={savingResultId === (result.resultId || result._id || result.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              {savingResultId === (result.resultId || result._id || result.id) ? (
                                <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              disabled={savingResultId === (result.resultId || result._id || result.id)}
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