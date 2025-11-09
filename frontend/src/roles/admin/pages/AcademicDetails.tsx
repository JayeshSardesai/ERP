import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Search, Calendar, MapPin, CreditCard, ChevronDown, ChevronRight, Plus, Trash2, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import { renderToString } from 'react-dom/server';
import AdmitCardTemplate from '../../../components/templates/AdmitCardTemplate';
import SimpleIDCardGenerator from '../../../components/SimpleIDCardGenerator';
import { useAuth } from '../../../auth/AuthContext';
import api from '../../../api/axios';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';

import { schoolAPI } from '../../../services/api';

interface Subject {
  name: string;
  teacherId?: string;
  teacherName?: string;
}

interface ClassSubjects {
  className: string;
  section?: string;
  subjects: Subject[];
}

interface Test {
  id: string;
  name: string;
  className: string;
  section: string;
  subjects: string[];
}

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  sequenceId?: string;
  className: string;
  section: string;
  profileImage?: string;
  // Additional fields for ID cards
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  address?: string;
  phone?: string;
  email?: string;
  admissionNumber?: string;
  academicYear?: string | number;
}

interface HallTicketData {
  subjectId: string;
  examDate: string;
  examTime: string;
  examHour: string;
  examMinute: string;
  examAmPm: string;
  roomNumber: string;
}

interface SubjectExam {
  id: string;
  name: string;
  className: string;
  section: string;
  testName: string;
}

const AcademicDetails: React.FC = () => {
  const { token, user } = useAuth();
  const { currentAcademicYear, viewingAcademicYear, isViewingHistoricalYear, setViewingYear, availableYears, loading: academicYearLoading } = useAcademicYear();

  // Use the useSchoolClasses hook to fetch classes configured by superadmin
  const {
    classesData,
    loading: classesLoading,
    error: classesError,
    getSectionsByClass,
    hasClasses
  } = useSchoolClasses();

  // Tab management
  const [activeTab, setActiveTab] = useState('subjects');

  // State management for Class Subjects
  const [classSubjects, setClassSubjects] = useState<ClassSubjects[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [expandedClass, setExpandedClass] = useState<string>('');
  const [expandedSection, setExpandedSection] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // State management for Hall Ticket Generation
  const [hallTicketClass, setHallTicketClass] = useState<string>('');
  const [hallTicketSection, setHallTicketSection] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [enableRoomNumbers, setEnableRoomNumbers] = useState<boolean>(false);
  const [customInstructions, setCustomInstructions] = useState<string[]>([
    'Bring this admit card to the examination hall',
    'Report 30 minutes before the exam',
    'Carry valid ID proof with this admit card',
    'Mobile phones strictly prohibited',
    'Follow all examination rules',
    'Malpractice leads to disqualification'
  ]);
  const [newInstruction, setNewInstruction] = useState<string>('');

  // ID Card Generation State
  const [idCardClass, setIdCardClass] = useState('');
  const [idCardSection, setIdCardSection] = useState('');
  const [idCardStudents, setIdCardStudents] = useState<Student[]>([]);

  // ID Card Orientation Options
  const idCardOrientations = [
    {
      id: 'landscape',
      name: 'Landscape',
      description: 'Horizontal ID card (85.6mm × 54mm)',
      preview: 'Credit card style layout'
    },
    {
      id: 'portrait',
      name: 'Portrait',
      description: 'Vertical ID card (54mm × 85.6mm)',
      preview: 'Vertical layout with larger photo'
    }
  ];

  // ID Card Generation State
  const [selectedOrientation, setSelectedOrientation] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjectExams, setSubjectExams] = useState<SubjectExam[]>([]);
  const [hallTicketData, setHallTicketData] = useState<{ [key: string]: HallTicketData }>({});
  const [hallTicketSections, setHallTicketSections] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Update available sections when class changes (for subjects tab)
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

  // Update available sections when hall ticket class changes
  useEffect(() => {
    if (hallTicketClass && classesData) {
      const sections = getSectionsByClass(hallTicketClass);
      setHallTicketSections(sections);
      // Auto-select first section if available
      if (sections.length > 0) {
        setHallTicketSection(sections[0].value);
      } else {
        setHallTicketSection('');
      }
    } else {
      setHallTicketSections([]);
      setHallTicketSection('');
    }
  }, [hallTicketClass, classesData]);

  // Fetch available tests when class and section change
  useEffect(() => {
    if (hallTicketClass && hallTicketSection && classesData) {
      fetchAvailableTests();
    } else {
      setAvailableTests([]);
    }
  }, [hallTicketClass, hallTicketSection, classesData]);

  // Get class list from superadmin configuration and sort in ascending order
  const classList = (classesData?.classes?.map((c: any) => c.className) || []).sort((a: string, b: string) => {
    // Convert to numbers for proper numeric sorting
    const numA = parseInt(a);
    const numB = parseInt(b);

    // If both are numbers, sort numerically
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    // If one or both are not numbers, sort alphabetically
    return a.localeCompare(b);
  });

  // Debug log to verify sorting
  console.log('📚 Classes sorted in ascending order:', classList);

  // Fetch subjects for all classes
  const fetchAllClassSubjects = async () => {
    setLoading(true);
    try {
      // Get the school code from localStorage or auth context
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      console.log('Fetching subjects with school code:', schoolCode);

      const response = await api.get('/class-subjects/classes');

      const data = response.data;
      setClassSubjects(data.data.classes || []);
    } catch (error) {
      console.error('Error fetching class subjects:', error);
      toast.error('Error connecting to server, trying fallback...');

      // Try direct test endpoints for each class as fallback
      await fetchClassesViaDirectEndpoints();
    } finally {
      setLoading(false);
    }
  };

  // Fallback method to fetch classes via direct test endpoints
  const fetchClassesViaDirectEndpoints = async () => {
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      if (!schoolCode) {
        toast.error('School code not available');
        return;
      }

      console.log('Trying direct endpoints with school code:', schoolCode);

      // Collect results for all classes in parallel
      const results = await Promise.all(
        classList.map(async (className) => {
          try {
            const response = await api.get(`/direct-test/class-subjects/${className}?schoolCode=${schoolCode}`);

            const data = response.data;
            return data.data;
          } catch (error) {
            console.error(`Error fetching class ${className}:`, error);
            return null;
          }
        })
      );

      // Filter out null responses and format
      const validResults = results.filter(Boolean);
      setClassSubjects(validResults);

      if (validResults.length > 0) {
        toast.success(`Found ${validResults.length} classes using fallback method`);
      } else {
        toast.error('No class data available');
      }
    } catch (error) {
      console.error('Error in fallback method:', error);
      toast.error('Failed to fetch class data');
    }
  };

  useEffect(() => {
    fetchAllClassSubjects();
  }, []);

  // Add subject to selected class and section
  const addSubject = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }

    if (!selectedSection) {
      toast.error('Please select a section first');
      return;
    }

    if (!newSubjectName.trim()) {
      toast.error('Please enter a subject name');
      return;
    }

    try {
      // Get the school code from localStorage or auth context
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      console.log('Adding subject with school code:', schoolCode, 'class:', selectedClass, 'section:', selectedSection);

      const response = await api.post('/class-subjects/add-subject', {
        className: selectedClass,
        grade: selectedClass,
        section: selectedSection,
        subjectName: newSubjectName.trim()
      });

      const data = response.data;
      toast.success(data.message);
      setNewSubjectName('');
      fetchAllClassSubjects(); // Refresh the list
    } catch (error) {
      console.error('Error adding subject:', error);
      toast.error('Network error while adding subject');
    }
  };

  // Remove subject from class and section
  const removeSubject = async (className: string, section: string, subjectName: string) => {
    if (!confirm(`Remove "${subjectName}" from Class ${className} Section ${section}?`)) {
      return;
    }

    try {
      const response = await api.delete('/class-subjects/remove-subject', {
        data: {
          className,
          section,
          subjectName
        }
      });

      const data = response.data;
      toast.success(data.message);
      fetchAllClassSubjects(); // Refresh the list
    } catch (error) {
      console.error('Error removing subject:', error);
      toast.error('Error removing subject');
    }
  };

  // Handle Enter key press for adding subjects
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addSubject();
    }
  };

  // Initialize basic subjects for selected class
  const initializeBasicSubjects = async () => {
    if (!selectedClass || !selectedSection) {
      toast.error('Please select a class and section first');
      return;
    }

    if (!confirm(`Initialize Class ${selectedClass} Section ${selectedSection} with basic subjects?`)) {
      return;
    }

    setLoading(true);
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      const response = await api.post('/class-subjects/initialize', {
        className: selectedClass,
        grade: selectedClass,
        section: selectedSection
      });

      const data = response.data;
      toast.success(data.message);
      fetchAllClassSubjects(); // Refresh the list
    } catch (error) {
      console.error('Error initializing basic subjects:', error);
      toast.error('Error initializing basic subjects');
    } finally {
      setLoading(false);
    }
  };

  // Get subjects for a specific class and section
  const getClassSectionSubjects = (className: string, section: string): Subject[] => {
    const classData = classSubjects.find(cs => cs.className === className && cs.section === section);
    return classData?.subjects || [];
  };


  // Toggle class expansion
  const toggleClassExpansion = (className: string) => {
    setExpandedClass(expandedClass === className ? '' : className);
  };

  // Toggle section expansion
  const toggleSectionExpansion = (className: string, section: string) => {
    const key = `${className}-${section}`;
    setExpandedSection(expandedSection === key ? '' : key);
  };

  // Hall Ticket Functions
  const fetchAvailableTests = async () => {
    try {
      if (!classesData) {
        console.log('⏳ Classes data not loaded yet, waiting...');
        return;
      }

      console.log('📡 Using tests from useSchoolClasses hook');
      console.log('📊 Available tests data:', classesData.tests);
      console.log('📊 Tests by class:', classesData.testsByClass);
      console.log('🎯 Looking for tests in class:', hallTicketClass);

      // Get tests for the selected class from the hook data
      let classTests = classesData.testsByClass[hallTicketClass] || [];
      console.log('🔍 Raw class tests for class', hallTicketClass, ':', classTests);
      console.log('🔍 Available class keys:', Object.keys(classesData.testsByClass));

      // If no tests found, try alternative class formats
      if (classTests.length === 0) {
        // Try with string conversion
        const altKey = String(hallTicketClass);
        classTests = classesData.testsByClass[altKey] || [];
        console.log('🔄 Trying alternative key format:', altKey, 'Result:', classTests);

        // If still no tests, try to find by matching className in all tests
        if (classTests.length === 0) {
          const allTests = classesData.tests || [];
          classTests = allTests.filter((test: any) =>
            test.className === hallTicketClass ||
            test.className === String(hallTicketClass) ||
            String(test.className) === String(hallTicketClass)
          );
          console.log('🔄 Trying direct filter from all tests:', classTests);
        }
      }

      // Transform to our Test interface
      const transformedTests: Test[] = classTests.map((test: any) => ({
        id: test._id || test.testId,
        name: test.testName || test.displayName || test.name,
        className: test.className,
        section: hallTicketSection,
        subjects: [] // Will be populated when we fetch subjects
      }));

      setAvailableTests(transformedTests);
      console.log('✅ Fetched tests for class from hook:', transformedTests);
      console.log('📊 Transformed tests count:', transformedTests.length);

      if (transformedTests.length === 0) {
        console.log(`ℹ️ No tests configured for Class ${hallTicketClass}`);
        toast.success(`No tests configured for Class ${hallTicketClass}. Please configure tests in the scoring system first.`);
      } else {
        toast.success(`Found ${transformedTests.length} test(s) for Class ${hallTicketClass}`);
      }

    } catch (error: any) {
      console.error('Error fetching tests:', error);
      toast.error('Failed to fetch available tests');

      // Fallback to mock data for development
      const mockTests: Test[] = [
        {
          id: 'mock-1',
          name: 'Unit Test 1',
          className: hallTicketClass,
          section: hallTicketSection,
          subjects: []
        },
        {
          id: 'mock-2',
          name: 'Mid Term Exam',
          className: hallTicketClass,
          section: hallTicketSection,
          subjects: []
        }
      ];
      setAvailableTests(mockTests);
    }
  };

  const fetchSubjects = async () => {
    if (!hallTicketClass || !hallTicketSection || !selectedTest) {
      toast.error('Please select class, section, and test');
      return;
    }

    setLoadingSubjects(true);
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      // Fetch actual subjects from the class-subjects API
      try {
        const response = await api.get('/class-subjects/classes', {
          headers: {
            'x-school-code': schoolCode.toUpperCase() // Ensure uppercase for consistency
          }
        });

        const responseData = response.data;
        console.log(' Class-subjects API response:', responseData);

        // Find the class data for the selected class and section
        const classData = responseData?.data?.classes?.find((c: any) =>
          c.className === hallTicketClass && c.section === hallTicketSection
        );

        if (classData && classData.subjects) {
          // Filter only active subjects
          const activeSubjects = classData.subjects.filter((subject: any) => subject.isActive !== false);
          console.log('🔍 Total subjects:', classData.subjects.length, 'Active subjects:', activeSubjects.length);

          const subjectExamsList: SubjectExam[] = activeSubjects.map((subject: any) => ({
            id: `${hallTicketClass}-${hallTicketSection}-${subject.name}-${selectedTest}`,
            name: subject.name,
            className: hallTicketClass,
            section: hallTicketSection,
            testName: availableTests.find(test => test.id === selectedTest)?.name || 'Test'
          }));

          setSubjectExams(subjectExamsList);

          // Initialize hall ticket data for each subject
          const initialData: { [key: string]: HallTicketData } = {};
          subjectExamsList.forEach(subject => {
            initialData[subject.id] = {
              subjectId: subject.id,
              examDate: '',
              examTime: '',
              examHour: '00',
              examMinute: '00',
              examAmPm: 'AM',
              roomNumber: ''
            };
          });
          setHallTicketData(initialData);

          // Also fetch students for this class and section
          await fetchStudentsForClass();

          toast.success(`Found ${subjectExamsList.length} subjects`);
          return; // Success, exit the function
        } else {
          console.log('❌ No subjects found for class-section combination in primary API');
          // Don't throw error, let it fall through to fallback
        }
      } catch (apiError) {
        console.log('🔄 Primary API failed, using fallback method...', apiError);
      }

      // Fallback to direct endpoint if primary API didn't return data
      try {
        console.log('🔄 Trying fallback endpoint for subjects...');
        const response = await api.get(`/direct-test/class-subjects/${hallTicketClass}?schoolCode=${schoolCode}`, {
          headers: {
            'x-school-code': schoolCode
          }
        });

        const data = response.data;
        console.log('📥 Fallback API response:', data);

        if (data.data && data.data.subjects && data.data.subjects.length > 0) {
          const subjectExamsList: SubjectExam[] = data.data.subjects.map((subject: any) => ({
            id: `${hallTicketClass}-${hallTicketSection}-${subject.name}-${selectedTest}`,
            name: subject.name,
            className: hallTicketClass,
            section: hallTicketSection,
            testName: availableTests.find(test => test.id === selectedTest)?.name || 'Test'
          }));

          setSubjectExams(subjectExamsList);

          // Initialize hall ticket data for each subject
          const initialData: { [key: string]: HallTicketData } = {};
          subjectExamsList.forEach(subject => {
            initialData[subject.id] = {
              subjectId: subject.id,
              examDate: '',
              examTime: '',
              examHour: '00',
              examMinute: '00',
              examAmPm: 'AM',
              roomNumber: ''
            };
          });
          setHallTicketData(initialData);

          // Also fetch students for this class and section
          await fetchStudentsForClass();

          toast.success(`Found ${subjectExamsList.length} subjects via fallback`);
          return; // Success
        } else {
          console.log('❌ Fallback API returned no subjects');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback API also failed:', fallbackError);
      }

      // If we reach here, both APIs failed
      console.log('❌ No subjects found for class-section combination');
      toast.error(`No subjects configured for Class ${hallTicketClass} Section ${hallTicketSection}. Please add subjects first in the "Class Subjects Management" tab.`);
      setSubjectExams([]);
      setHallTicketData({});
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Fetch students for class (hall tickets)
  const fetchStudentsForClass = async () => {
    if (!hallTicketClass || !hallTicketSection) {
      toast.error('Please select class and section first');
      return;
    }

    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
      // Use token from useAuth hook instead of localStorage
      const authToken = token || localStorage.getItem('erp.authToken');

      if (!schoolCode || !authToken) {
        toast.error('Authentication required. Please login again.');
        console.error('❌ Missing credentials:', { schoolCode: !!schoolCode, token: !!authToken });
        return;
      }

      console.log(`📡 Fetching students for Hall Tickets - Class ${hallTicketClass} Section ${hallTicketSection}`);

      // Try to fetch real students from API
      try {
        const response = await api.get('/users/role/student', {
          headers: {
            'X-School-Code': schoolCode.toUpperCase()
          }
        });

        const data = response.data;

        if (data.success && data.data && data.data.length > 0) {
          // Filter for students in the specific class and section
          const filteredStudents = data.data.filter((student: any) => {
            const studentClass = student.studentDetails?.currentClass || student.currentclass || student.class || student.className;
            const studentSection = student.studentDetails?.currentSection || student.currentsection || student.section;

            return String(studentClass) === String(hallTicketClass) &&
              String(studentSection).toUpperCase() === String(hallTicketSection).toUpperCase();
          });

          if (filteredStudents.length > 0) {
            // Transform real students to include sequence IDs and profile images
            const studentsWithSeqId = filteredStudents.map((student: any, index: number) => ({
              id: student._id || student.id,
              name: student.name?.displayName || `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim() || student.firstname + ' ' + student.lastname || 'Unknown Student',
              rollNumber: student.studentDetails?.rollNumber || student.rollNumber || student.sequenceId || `${schoolCode}-${hallTicketSection}-${String(index + 1).padStart(4, '0')}`,
              sequenceId: student.userId || student.studentDetails?.admissionNumber || student.sequenceId || `${schoolCode}-${hallTicketSection}-${String(index + 1).padStart(4, '0')}`,
              className: hallTicketClass,
              section: hallTicketSection,
              // Include profile image from database with proper URL construction
              profileImage: (() => {
                const rawImageUrl = student.profileImage || student.profilePicture;
                if (!rawImageUrl) return null;

                // If it starts with /uploads, construct full URL
                if (rawImageUrl.startsWith('/uploads')) {
                  const envBase = (import.meta.env.VITE_API_BASE_URL as string);
                  const baseUrl = envBase.replace(/\/api\/?$/, '');
                  return `${baseUrl}${rawImageUrl}`;
                }

                // Otherwise return as is (for external URLs or full URLs)
                return rawImageUrl;
              })()
            }));

            setStudents(studentsWithSeqId);
            toast.success(`Loaded ${studentsWithSeqId.length} students for Class ${hallTicketClass} Section ${hallTicketSection}`);
            console.log('✅ Real students loaded:', studentsWithSeqId);
            return;
          } else {
            console.log(`⚠️ No students found for Class ${hallTicketClass} Section ${hallTicketSection} in ${data.data.length} total students`);
            setStudents([]);
            toast.error(`No students found for Class ${hallTicketClass} Section ${hallTicketSection}`);
            return;
          }
        }
      } catch (apiError) {
        console.log('❌ Students API failed:', apiError);
      }

      // Try school-users endpoint pattern as fallback
      try {
        console.log('🔄 Trying school-users endpoint pattern...');

        const altResponse = await api.get(`/school-users/${schoolCode}/users`);
        const altData = altResponse.data;
        console.log('📥 School-users API Response:', altData);

        if (altData.success && altData.data && altData.data.length > 0) {
          // Filter for students in the specific class and section
          const filteredStudents = altData.data.filter((user: any) => {
            const isStudent = user.role === 'student';
            const userClass = user.studentDetails?.currentClass || user.currentclass || user.class || user.className;
            const userSection = user.studentDetails?.currentSection || user.currentsection || user.section;
            const userName = `${user.name?.firstName || user.firstname || ''} ${user.name?.lastName || user.lastname || ''}`.trim();

            console.log(`🔍 School-user: ${userName}, Role: ${user.role}, Class: ${userClass}, Section: ${userSection}`);

            return isStudent &&
              String(userClass) === String(hallTicketClass) &&
              String(userSection).toUpperCase() === String(hallTicketSection).toUpperCase();
          });

          console.log(`🔍 Filtered students from school-users for Class ${hallTicketClass} Section ${hallTicketSection}:`, filteredStudents);

          if (filteredStudents.length > 0) {
            const studentsWithSeqId = filteredStudents.map((student: any, index: number) => ({
              id: student._id || student.id,
              name: student.name?.displayName || `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim() || student.firstname + ' ' + student.lastname || 'Unknown Student',
              rollNumber: student.studentDetails?.rollNumber || student.rollNumber || student.sequenceId || `${schoolCode}-${hallTicketSection}-${String(index + 1).padStart(4, '0')}`,
              sequenceId: student.userId || student.studentDetails?.admissionNumber || student.sequenceId || `${schoolCode}-${hallTicketSection}-${String(index + 1).padStart(4, '0')}`,
              className: hallTicketClass,
              section: hallTicketSection,
              // Include profile image from database with proper URL construction
              profileImage: (() => {
                const rawImageUrl = student.profileImage || student.profilePicture;
                if (!rawImageUrl) return null;

                // If it starts with /uploads, construct full URL
                if (rawImageUrl.startsWith('/uploads')) {
                  const envBase = (import.meta.env.VITE_API_BASE_URL as string);
                  const baseUrl = envBase.replace(/\/api\/?$/, '');
                  return `${baseUrl}${rawImageUrl}`;
                }

                // Otherwise return as is (for external URLs or full URLs)
                return rawImageUrl;
              })()
            }));

            setStudents(studentsWithSeqId);
            toast.success(`Loaded ${studentsWithSeqId.length} students for Class ${hallTicketClass} Section ${hallTicketSection}`);
            console.log('✅ Real students loaded from school-users endpoint:', studentsWithSeqId);
            return;
          } else {
            console.log(`⚠️ No students found in school-users endpoint for Class ${hallTicketClass} Section ${hallTicketSection}`);
            setStudents([]);
            toast.error(`No students found for Class ${hallTicketClass} Section ${hallTicketSection}`);
            return;
          }
        }
      } catch (altApiError) {
        console.log('❌ School-users API also failed:', altApiError);
      }

      // No students found - show error message
      console.log('⚠️ No students found for the selected class and section');
      setStudents([]);
      toast.error(`No students found for Class ${hallTicketClass} Section ${hallTicketSection}. Please add students to this class first.`);
    } catch (error: any) {
      console.error('Error in fetchStudentsForClass:', error);
      setStudents([]);
    }
  };

  // Fetch students for ID card generation
  const fetchStudentsForIdCards = async () => {
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

      if (!schoolCode || !token) {
        toast.error('Authentication error. Please login again.');
        return;
      }

      console.log(`📡 Fetching students for ID Cards - Class ${idCardClass} Section ${idCardSection}`);

      // Use the same API pattern as hall tickets
      try {
        const response = await api.get('/users/role/student', {
          headers: {
            'X-School-Code': schoolCode.toUpperCase()
          }
        });

        const data = response.data;

        if (data.success && data.data && data.data.length > 0) {
          // Filter students by class and section
          const filteredStudents = data.data.filter((student: any) => {
            const studentClass = student.studentDetails?.currentClass || student.currentclass || student.class || student.className;
            const studentSection = student.studentDetails?.currentSection || student.currentsection || student.section;

            return String(studentClass) === String(idCardClass) &&
              String(studentSection).toUpperCase() === String(idCardSection).toUpperCase();
          });

          if (filteredStudents.length > 0) {
            const studentsWithData = filteredStudents.map((student: any, index: number) => ({
              _id: student._id || student.id,
              id: student._id || student.id,
              name: student.name?.displayName || `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim() || 'Unknown Student',
              rollNumber: student.studentDetails?.rollNumber || student.rollNumber || `${schoolCode}-${idCardSection}-${String(index + 1).padStart(4, '0')}`,
              sequenceId: student.userId || student.studentDetails?.admissionNumber || `${schoolCode}-${idCardSection}-${String(index + 1).padStart(4, '0')}`,
              className: idCardClass,
              section: idCardSection,
              profileImage: student.profileImage || student.profilePicture || null,
              // Additional fields for ID cards - try multiple field paths
              fatherName: student.parentDetails?.fatherName || student.fatherName || student.parent?.father?.name || 'Not Available',
              motherName: student.parentDetails?.motherName || student.motherName || student.parent?.mother?.name || 'Not Available',
              dateOfBirth: student.personalDetails?.dateOfBirth || student.dateOfBirth || student.dob || student.personal?.dateOfBirth || 'Not Available',
              bloodGroup: student.personalDetails?.bloodGroup || student.bloodGroup || student.personal?.bloodGroup || student.medicalInfo?.bloodGroup || 'Not Available',
              address: student.address?.permanent?.street || student.address?.street || student.personalDetails?.address || student.address || 'Not Available',
              phone: student.contact?.primaryPhone || student.contact?.phone || student.phone || student.personalDetails?.phone || 'Not Available'
            }));

            setIdCardStudents(studentsWithData);
            toast.success(`Loaded ${studentsWithData.length} students for ID card generation`);
            console.log('✅ ID Card students loaded:', studentsWithData);
            return;
          } else {
            console.log(`⚠️ No students found for Class ${idCardClass} Section ${idCardSection}`);
            setIdCardStudents([]);
            toast.error(`No students found for Class ${idCardClass} Section ${idCardSection}`);
            return;
          }
        }
      } catch (apiError) {
        console.log('❌ ID Card Students API failed:', apiError);
      }

      // No students found - show error message
      console.log('⚠️ No students found for the selected class and section');
      setIdCardStudents([]);
      toast.error(`No students found for Class ${idCardClass} Section ${idCardSection}. Please add students to this class first.`);
    } catch (error: any) {
      console.error('Error in fetchStudentsForIdCards:', error);
      setIdCardStudents([]);
    }
  };

  // Functions to manage instructions
  const addInstruction = () => {
    if (newInstruction.trim() && !customInstructions.includes(newInstruction.trim())) {
      setCustomInstructions(prev => [...prev, newInstruction.trim()]);
      setNewInstruction('');
      toast.success('Instruction added successfully');
    } else if (customInstructions.includes(newInstruction.trim())) {
      toast.error('This instruction already exists');
    }
  };

  const removeInstruction = (index: number) => {
    setCustomInstructions(prev => prev.filter((_, i) => i !== index));
    toast.success('Instruction removed successfully');
  };

  const resetToDefaultInstructions = () => {
    setCustomInstructions([
      'Bring this admit card to the examination hall',
      'Report 30 minutes before the exam',
      'Carry valid ID proof with this admit card',
      'Mobile phones strictly prohibited',
      'Follow all examination rules',
      'Malpractice leads to disqualification'
    ]);
    toast.success('Instructions reset to default');
  };

  // Function to update hall ticket data
  const updateHallTicketData = (subjectId: string, field: string, value: string) => {
    setHallTicketData(prev => {
      const currentData = prev[subjectId] || {
        subjectId,
        examDate: '',
        examTime: '',
        examHour: '00',
        examMinute: '00',
        examAmPm: 'AM',
        roomNumber: ''
      };
      const updatedData = {
        ...currentData,
        [field]: value
      };

      // Auto-update examTime when hour/minute/ampm changes for backward compatibility
      if (field === 'examHour' || field === 'examMinute' || field === 'examAmPm') {
        const hour = field === 'examHour' ? value : (currentData.examHour || '00');
        const minute = field === 'examMinute' ? value : (currentData.examMinute || '00');
        const ampm = field === 'examAmPm' ? value : (currentData.examAmPm || 'AM');

        // Convert to 24-hour format for examTime field
        let hour24 = parseInt(hour as string);
        if (hour === '00') hour24 = 12; // Handle "00" as 12
        if (ampm === 'AM' && hour24 === 12) hour24 = 0;
        if (ampm === 'PM' && hour24 !== 12) hour24 += 12;

        updatedData.examTime = `${hour24.toString().padStart(2, '0')}:${minute}`;

        console.log(`🔄 Auto-updating examTime: ${hour}:${minute} ${ampm} → ${updatedData.examTime}`);
      }

      return {
        ...prev,
        [subjectId]: updatedData
      };
    });
  };

  // Function to convert image to base64 for better print compatibility
  const convertImageToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('🖼️ Starting image conversion for URL:', url);

      const img = new Image();

      // Set crossOrigin before setting src
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        console.log('✅ Image loaded successfully, converting to base64...');
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const base64 = canvas.toDataURL('image/png');
          console.log('✅ Base64 conversion successful, length:', base64.length);
          resolve(base64);
        } catch (error) {
          console.error('❌ Canvas conversion error:', error);
          reject(error);
        }
      };

      img.onerror = (error) => {
        console.error('❌ Image load error:', error);
        console.error('❌ Failed URL:', url);
        reject(new Error('Failed to load image from URL'));
      };

      // Set src after setting up event handlers
      img.src = url;
      console.log('📡 Image src set, waiting for load...');
    });
  };

  const generateHallTickets = async () => {
    const completedSubjects = subjectExams.filter(subject => {
      const examData = hallTicketData[subject.id];
      const hasRequiredFields = examData?.examDate &&
        examData?.examHour &&
        examData?.examMinute &&
        examData?.examAmPm;

      console.log(`🔍 Checking subject ${subject.name}:`, {
        examDate: examData?.examDate,
        examHour: examData?.examHour,
        examMinute: examData?.examMinute,
        examAmPm: examData?.examAmPm,
        roomNumber: examData?.roomNumber,
        hasRequiredFields
      });

      // If room numbers are enabled, require room number as well
      if (enableRoomNumbers) {
        return hasRequiredFields && examData?.roomNumber;
      }

      // If room numbers are disabled, only require date and time components
      return hasRequiredFields;
    });

    if (completedSubjects.length === 0) {
      const requiredFields = enableRoomNumbers
        ? 'exam date, time, and room number'
        : 'exam date and time';
      toast.error(`Please fill ${requiredFields} for at least one subject`);
      return;
    }

    if (students.length === 0) {
      toast.error('No students found for hall ticket generation');
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Preparing admit cards with school information...');

    // We'll handle logo conversion after getting the template settings

    try {
      // Get test name
      const testName = availableTests.find(test => test.id === selectedTest)?.name || 'Exam';

      // REPLICATE EXACT UniversalTemplate data fetching logic
      let templateSettings = {
        schoolName: user?.schoolName || 'School Name',
        schoolCode: user?.schoolCode || 'SCH001',
        website: 'www.edulogix.com',
        logoUrl: '',
        headerColor: '#1f2937',
        accentColor: '#3b82f6',
        address: '123 School Street, City, State 12345',
        phone: '+91-XXXXXXXXXX',
        email: 'info@school.com'
      };

      // First try localStorage (same as UniversalTemplate)
      const savedTemplate = localStorage.getItem('universalTemplate');
      console.log('🔍 Raw localStorage data:', savedTemplate);

      if (savedTemplate) {
        try {
          const templateData = JSON.parse(savedTemplate);
          console.log('📋 Parsed template data:', templateData);
          templateSettings = { ...templateSettings, ...templateData };
          console.log('✅ Using saved UniversalTemplate settings:', templateSettings);
        } catch (e) {
          console.log('❌ Failed to parse saved template data:', e);
        }
      } else {
        console.log('❌ No universalTemplate found in localStorage');
        // Let's check what keys exist in localStorage
        console.log('🔍 Available localStorage keys:', Object.keys(localStorage));
      }

      // If no saved template OR template has default values, fetch using EXACT same logic as UniversalTemplate
      const hasDefaultValues = templateSettings.schoolCode === 'SCH001' || templateSettings.schoolName === 'School Name';
      if ((!savedTemplate || hasDefaultValues) && (user?.schoolCode || user?.schoolId)) {
        console.log('No saved template, fetching school data using UniversalTemplate logic...');

        let schoolData = null;

        try {
          console.log('Fetching school info using school API...');
          let response;

          const schoolIdentifier = user?.schoolId || user?.schoolCode;
          if (schoolIdentifier) {
            try {
              // Use the new /info endpoint that bypasses school-specific database issues
              response = await api.get(`/schools/${schoolIdentifier}/info`);
              console.log('Success with school info endpoint:', response?.data);
            } catch {
              console.log('School info endpoint failed, trying original endpoint...');
              // Fallback to original endpoint if new one fails
              response = await schoolAPI.getSchoolById(schoolIdentifier);
              console.log('Success with original endpoint:', response?.data);
            }
          }

          // Handle both wrapped and direct response formats
          const data = response?.data?.data || response?.data;
          if (data && (data.name || data.schoolName)) {
            console.log('School data found:', data);

            // Format address from nested structure (EXACT same as UniversalTemplate)
            let formattedAddress = '123 School Street, City, State 12345';
            if (data.address) {
              const addr = data.address;
              // Create a more concise address format
              const addressParts = [
                addr.area || addr.street?.substring(0, 30), // Limit street to 30 chars or use area
                addr.city,
                addr.state,
                addr.pinCode || addr.zipCode
              ].filter(Boolean);

              // Join with commas and limit total length
              formattedAddress = addressParts.join(', ');
              if (formattedAddress.length > 60) {
                formattedAddress = formattedAddress.substring(0, 57) + '...';
              }
            }

            // Format website URL to be more concise (EXACT same as UniversalTemplate)
            let formattedWebsite = data.contact?.website || data.website || 'www.edulogix.com';
            if (formattedWebsite.length > 25) {
              // Remove protocol and www if present, then truncate
              formattedWebsite = formattedWebsite
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '');
              if (formattedWebsite.length > 25) {
                formattedWebsite = formattedWebsite.substring(0, 22) + '...';
              }
            }

            // Construct full logo URL with backend base URL (same as ManageUsers.tsx)
            let logoUrl = '';
            if (data.logoUrl) {
              // If logoUrl starts with /uploads, prepend the backend URL
              if (data.logoUrl.startsWith('/uploads')) {
                // Use the same approach as ManageUsers.tsx - get base URL without /api suffix
                const envBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5050/api';
                const baseUrl = envBase.replace(/\/api\/?$/, '');
                logoUrl = `${baseUrl}${data.logoUrl}`;
                console.log('🖼️ Constructed logo URL:', logoUrl);
              } else {
                logoUrl = data.logoUrl;
                console.log('🖼️ Using direct logo URL:', logoUrl);
              }
            }

            schoolData = {
              schoolName: data.name || data.schoolName || user?.schoolName,
              schoolCode: data.code || data.schoolCode || user?.schoolCode,
              address: formattedAddress,
              phone: data.contact?.phone || data.phone || data.contactNumber || templateSettings.phone,
              email: data.contact?.email || data.email || data.contactEmail || data.principalEmail || templateSettings.email,
              website: formattedWebsite,
              logoUrl: logoUrl
            };
          }

          if (schoolData) {
            templateSettings = {
              ...templateSettings,
              schoolName: schoolData.schoolName || templateSettings.schoolName,
              schoolCode: schoolData.schoolCode || templateSettings.schoolCode,
              address: schoolData.address || templateSettings.address,
              phone: schoolData.phone || templateSettings.phone,
              email: schoolData.email || templateSettings.email,
              website: schoolData.website || templateSettings.website,
              logoUrl: schoolData.logoUrl || templateSettings.logoUrl
            };
          } else {
            // Fallback to auth context data (EXACT same as UniversalTemplate)
            console.log('Using fallback data from user context');
            templateSettings = {
              ...templateSettings,
              schoolName: user?.schoolName || templateSettings.schoolName,
              schoolCode: user?.schoolCode || templateSettings.schoolCode
            };
          }
        } catch (error: any) {
          console.log('Failed to fetch from school API:', error.response?.status || error.message);
        }
      }

      // Final check - if we still have default values, try to get real data from user context
      if (templateSettings.schoolCode === 'SCH001' || templateSettings.schoolName === 'School Name') {
        console.log('⚠️ Still have default values, trying user context...');
        console.log('👤 User context:', user);

        // Try to get real school data from user context
        if (user?.schoolCode && user.schoolCode !== 'SCH001') {
          templateSettings.schoolCode = user.schoolCode;
        }
        if (user?.schoolName && user.schoolName !== 'School Name') {
          templateSettings.schoolName = user.schoolName;
        }

        // If we have SB as school code, let's use some known data
        if (user?.schoolCode === 'SB') {
          templateSettings = {
            ...templateSettings,
            schoolName: 'South Bridge School',
            schoolCode: 'SB',
            address: 'Vijayanagar, Bengaluru, Karnataka, 560040',
            phone: '+91-1234567890',
            email: 'revathi.sb@gmail.com',
            website: 'www.southbridgeschool.com'
          };
          console.log('🏫 Applied SB school data override');
        }

        console.log('🔄 Updated templateSettings from user context:', templateSettings);
      }

      console.log('🏫 Final templateSettings for admit cards:', templateSettings);
      console.log('🖼️ Logo URL being used:', templateSettings.logoUrl || 'No logo URL found');

      // Convert logo to base64 for better print compatibility
      let logoBase64 = '';
      if (templateSettings.logoUrl) {
        try {
          console.log('🖼️ Converting logo to base64 for print compatibility...');
          logoBase64 = await convertImageToBase64(templateSettings.logoUrl);
          console.log('✅ Logo converted to base64 successfully');
          // Use base64 logo for printing if conversion was successful
          if (logoBase64) {
            templateSettings.logoUrl = logoBase64;
            console.log('✅ Using base64 logo for hall tickets');
          }
        } catch (error) {
          console.log('❌ Failed to convert logo to base64:', error);
          console.log('📝 Will use original URL as fallback');
        }
      }

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Generate hall tickets using UniversalTemplate
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast.error('Please allow popups to generate hall tickets');
        return;
      }

      // Debug: Show what school data we're using
      console.log('🔍 School data being used in admit cards:', {
        source: savedTemplate ? 'localStorage (UniversalTemplate)' : 'API or defaults',
        data: templateSettings
      });

      // Sort completed subjects by exam date and time
      const sortedSubjects = [...completedSubjects].sort((a, b) => {
        const examDataA = hallTicketData[a.id];
        const examDataB = hallTicketData[b.id];

        console.log(`📅 Sorting: ${a.name} (${examDataA.examDate} ${examDataA.examTime}) vs ${b.name} (${examDataB.examDate} ${examDataB.examTime})`);

        // First sort by date
        const dateA = new Date(examDataA.examDate);
        const dateB = new Date(examDataB.examDate);

        // Compare dates
        if (dateA.getTime() !== dateB.getTime()) {
          const result = dateA.getTime() - dateB.getTime();
          console.log(`📅 Date comparison: ${examDataA.examDate} vs ${examDataB.examDate} = ${result}`);
          return result;
        }

        // If dates are same, sort by time (convert 12-hour to minutes for proper comparison)
        const getMinutesFrom12Hour = (hour: string, minute: string, ampm: string): number => {
          if (!hour || !minute || !ampm) return 0;

          let hourNum = parseInt(hour);
          const minuteNum = parseInt(minute);

          // Handle "00" hour case - treat as 12
          if (hourNum === 0) hourNum = 12;

          // Convert 12-hour to 24-hour for comparison
          if (ampm === 'AM' && hourNum === 12) hourNum = 0;
          if (ampm === 'PM' && hourNum !== 12) hourNum += 12;

          return hourNum * 60 + minuteNum;
        };

        const minutesA = getMinutesFrom12Hour(examDataA.examHour, examDataA.examMinute, examDataA.examAmPm);
        const minutesB = getMinutesFrom12Hour(examDataB.examHour, examDataB.examMinute, examDataB.examAmPm);
        const timeResult = minutesA - minutesB;

        console.log(`🕐 Time comparison: ${examDataA.examHour}:${examDataA.examMinute} ${examDataA.examAmPm} (${minutesA}min) vs ${examDataB.examHour}:${examDataB.examMinute} ${examDataB.examAmPm} (${minutesB}min) = ${timeResult}`);
        return timeResult;
      });

      console.log('📋 Final sorted subjects:', sortedSubjects.map(s => ({
        name: s.name,
        date: hallTicketData[s.id].examDate,
        time: hallTicketData[s.id].examTime
      })));

      // Create hall ticket HTML for each student using AdmitCardTemplate component

      const hallTicketsHTML = students.map(student => {
        // Convert subjects to the format expected by AdmitCardTemplate
        const templateSubjects = sortedSubjects.map(subject => {
          const examData = hallTicketData[subject.id];
          return {
            id: subject.id,
            name: subject.name,
            examDate: examData.examDate,
            examTime: examData.examTime,
            examHour: examData.examHour,
            examMinute: examData.examMinute,
            examAmPm: examData.examAmPm,
            roomNumber: examData.roomNumber
          };
        });

        // Use AdmitCardTemplate component to generate HTML
        try {
          return renderToString(
            React.createElement(AdmitCardTemplate, {
              settings: templateSettings,
              student: student,
              subjects: templateSubjects,
              testName: testName,
              enableRoomNumbers: enableRoomNumbers,
              instructions: customInstructions.length > 0 ? customInstructions : undefined,
              mode: 'print'
            })
          );
        } catch (error) {
          console.error('Error rendering AdmitCardTemplate:', error);
          // Fallback to a simple HTML structure
          return `
            <div style="page-break-after: always; padding: 20px; font-family: Arial, sans-serif;">
              <h1>${templateSettings.schoolName}</h1>
              <h2>ADMIT CARD</h2>
              <p><strong>Student:</strong> ${student.name}</p>
              <p><strong>Class:</strong> ${student.className} - Section ${student.section}</p>
              <p><strong>Roll Number:</strong> ${student.rollNumber}</p>
              <p>Error rendering template. Please try again.</p>
            </div>
          `;
        }
      }).join('');

      // Complete HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Hall Tickets - ${testName}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none !important; }
              }
              @page {
                size: A4;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                line-height: 1.3;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            ${hallTicketsHTML}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      toast.success(`Admit cards generated for ${students.length} students with ${completedSubjects.length} subjects`);

      console.log('Admit cards generated successfully:', {
        students: students.length,
        subjects: completedSubjects.length,
        testName
      });

    } catch (error: any) {
      console.error('Error generating admit cards:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to generate admit cards');
    }
  };


  if (showPreview && idCardStudents.length > 0) {
    return (
      <SimpleIDCardGenerator
        selectedStudents={idCardStudents.map(student => ({
          id: student.id,
          _id: student.id,
          name: student.name,
          sequenceId: student.sequenceId || student.rollNumber || `STU${student.id}`,
          rollNumber: student.rollNumber,
          className: student.className,
          section: student.section,
          profileImage: student.profileImage,
          dateOfBirth: student.dateOfBirth,
          bloodGroup: student.bloodGroup,
          fatherName: student.fatherName,
          motherName: student.motherName,
          address: student.address,
          phone: student.phone,
          email: student.email
        }))}
        onClose={() => setShowPreview(false)}
        initialOrientation={selectedOrientation as 'landscape' | 'portrait'}
        lockOrientation={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Academic Management</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">Manage subjects and generate hall tickets for your school</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-col sm:flex-row sm:space-x-8 px-3 sm:px-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('subjects')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm w-full sm:w-auto ${activeTab === 'subjects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="truncate">Class Subjects Management</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('hallticket')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm w-full sm:w-auto ${activeTab === 'hallticket'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">Hall Ticket Generation</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('idcard')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm w-full sm:w-auto ${activeTab === 'idcard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="truncate">School ID Card Generation</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Show error if classes failed to load */}
        {classesError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">
              Error loading classes: {classesError}
            </p>
          </div>
        )}

        {/* Show message if no classes are configured */}
        {!classesLoading && !hasClasses() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              No classes have been configured for your school yet. Please contact your super admin to add classes.
            </p>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'subjects' && (
          <div>

            {/* Add Subject Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Add New Subject</h2>
                <button
                  onClick={initializeBasicSubjects}
                  disabled={loading || !selectedClass || !selectedSection}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  Initialize Basic Subjects
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a class...</option>
                    {classList.map(cls => (
                      <option key={cls} value={cls}>
                        Class {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    disabled={!selectedClass || availableSections.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Choose section...</option>
                    {availableSections.map(section => (
                      <option key={section.value} value={section.value}>
                        Section {section.section}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter subject name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Add Button */}
                <div className="flex items-end">
                  <button
                    onClick={addSubject}
                    disabled={!selectedClass || !selectedSection || !newSubjectName.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Subject
                  </button>
                </div>
              </div>
            </div>

            {/* Classes List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Classes & Subjects</h2>

              {loading || classesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading classes...</p>
                </div>
              ) : classList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No classes configured. Please contact your super admin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classList.map(className => {
                    const isClassExpanded = expandedClass === className;
                    const classSections = classesData?.sectionsByClass?.[className] || [];

                    return (
                      <div key={className} className="border border-gray-200 rounded-lg">
                        {/* Class Header */}
                        <div
                          onClick={() => toggleClassExpansion(className)}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            {isClassExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            )}
                            <h3 className="text-lg font-medium text-gray-800">
                              Class {className}
                            </h3>
                            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                              {classSections.length} section{classSections.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Sections List */}
                        {isClassExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50">
                            {classSections.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">
                                No sections configured for Class {className}
                              </p>
                            ) : (
                              <div className="space-y-2 p-4">
                                {classSections.map((sectionObj: any) => {
                                  const section = sectionObj.section;
                                  const sectionKey = `${className}-${section}`;
                                  const isSectionExpanded = expandedSection === sectionKey;
                                  const subjects = getClassSectionSubjects(className, section);

                                  return (
                                    <div key={sectionKey} className="border border-gray-300 rounded-lg bg-white">
                                      {/* Section Header */}
                                      <div
                                        onClick={() => toggleSectionExpansion(className, section)}
                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                                      >
                                        <div className="flex items-center gap-2">
                                          {isSectionExpanded ? (
                                            <ChevronDown className="h-3 w-3 text-gray-600" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3 text-gray-600" />
                                          )}
                                          <h4 className="text-base font-medium text-gray-700">
                                            Section {section}
                                          </h4>
                                          <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                            {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Subjects for this section */}
                                      {isSectionExpanded && (
                                        <div className="border-t border-gray-200 p-3">
                                          {subjects.length === 0 ? (
                                            <p className="text-gray-500 text-center py-3 text-sm">
                                              No subjects added yet for Class {className} Section {section}
                                            </p>
                                          ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                              {subjects.map((subject, index) => (
                                                <div
                                                  key={index}
                                                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                                                >
                                                  <span className="text-gray-800 font-medium text-sm">
                                                    {subject.name}
                                                  </span>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      removeSubject(className, section, subject.name);
                                                    }}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Remove subject"
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hallticket' && (
          <div>
            {/* Academic Year Warning Banner */}
            {isViewingHistoricalYear && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>📚 Viewing Historical Data:</strong> You are viewing data from {viewingAcademicYear}. This data is read-only.
                </p>
              </div>
            )}

            {/* Debug Information */}
            {classesData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Debug Info:</h3>
                <div className="text-xs text-yellow-700 space-y-1">
                  <p>Classes Data Loaded: ✅</p>
                  <p>Total Tests: {classesData.tests?.length || 0}</p>
                  <p>Tests by Class Keys: {Object.keys(classesData.testsByClass || {}).join(', ')}</p>
                  <p>Selected Class: {hallTicketClass}</p>
                  <p>Selected Section: {hallTicketSection}</p>
                  <p>Available Tests: {availableTests.length}</p>
                  <p>Selected Test: {selectedTest}</p>
                  <p>Subjects Found: {subjectExams.length}</p>
                </div>
                {hallTicketClass && hallTicketSection && subjectExams.length === 0 && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs text-red-700">
                      No subjects found for Class {hallTicketClass} Section {hallTicketSection}.
                      Please add subjects in the &quot;Class Subjects Management&quot; tab first.
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Available classes in database: Check console for details
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Hall Ticket Generation Content */}
            <div className="space-y-6">
              {/* Class, Section, and Test Selection */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Generate Hall Tickets</h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Academic Year Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={viewingAcademicYear}
                      onChange={(e) => setViewingYear(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year} {year === currentAcademicYear && '(Current)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Class Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={hallTicketClass}
                      onChange={(e) => setHallTicketClass(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a class...</option>
                      {classList.map(cls => (
                        <option key={cls} value={cls}>
                          Class {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Section Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={hallTicketSection}
                      onChange={(e) => setHallTicketSection(e.target.value)}
                      disabled={!hallTicketClass || hallTicketSections.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Choose section...</option>
                      {hallTicketSections.map(section => (
                        <option key={section.value} value={section.value}>
                          Section {section.section}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Test Name Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Test Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTest}
                      onChange={(e) => setSelectedTest(e.target.value)}
                      disabled={!hallTicketClass || !hallTicketSection || availableTests.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Choose test...</option>
                      {availableTests.map(test => (
                        <option key={test.id} value={test.id}>
                          {test.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Room Number Toggle */}
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enableRoomNumbers"
                      checked={enableRoomNumbers}
                      onChange={(e) => setEnableRoomNumbers(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableRoomNumbers" className="text-sm font-medium text-gray-700">
                      Include Room Numbers in Hall Tickets
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    {enableRoomNumbers
                      ? "Room numbers will be required and displayed in the hall tickets"
                      : "Room numbers will be optional and not displayed in the hall tickets"
                    }
                  </p>
                </div>

                {/* Instructions Management */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Manage Hall Ticket Instructions</h3>

                  {/* Add New Instruction */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      placeholder="Enter new instruction..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && addInstruction()}
                    />
                    <button
                      onClick={addInstruction}
                      disabled={!newInstruction.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>

                  {/* Current Instructions */}
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-gray-600 font-medium">Current Instructions:</p>
                    {customInstructions.map((instruction, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <span className="text-xs text-gray-700 flex-1">{instruction}</span>
                        <button
                          onClick={() => removeInstruction(index)}
                          className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={resetToDefaultInstructions}
                    className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700"
                  >
                    Reset to Default Instructions
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Search Button */}
                  <div className="flex items-end">
                    <button
                      onClick={fetchSubjects}
                      disabled={!hallTicketClass || !hallTicketSection || !selectedTest}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      Search Subjects
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Subjects and Students List */}
            {subjectExams.length > 0 && (
              <div className="space-y-6">
                {/* Subjects Table */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                      Subjects for {availableTests.find(test => test.id === selectedTest)?.name} - Class {hallTicketClass} Section {hallTicketSection}
                    </h2>
                    <button
                      onClick={generateHallTickets}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Generate Hall Tickets
                    </button>
                  </div>

                  {loadingSubjects ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading subjects...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Subject Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Exam Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Exam Time
                            </th>
                            {enableRoomNumbers && (
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Room Number
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {subjectExams.map((subject) => (
                            <tr key={subject.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {subject.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <input
                                    type="date"
                                    value={hallTicketData[subject.id]?.examDate || ''}
                                    onChange={(e) => updateHallTicketData(subject.id, 'examDate', e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center gap-1">
                                  {/* Hour Dropdown (00, 1-12) */}
                                  <select
                                    value={hallTicketData[subject.id]?.examHour || '00'}
                                    onChange={(e) => updateHallTicketData(subject.id, 'examHour', e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={{ width: '60px' }}
                                  >
                                    <option value="00">00</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(hour => (
                                      <option key={hour} value={hour.toString()}>{hour}</option>
                                    ))}
                                  </select>
                                  <span className="text-gray-500">:</span>
                                  {/* Minute Dropdown (00-59) */}
                                  <select
                                    value={hallTicketData[subject.id]?.examMinute || '00'}
                                    onChange={(e) => updateHallTicketData(subject.id, 'examMinute', e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={{ width: '60px' }}
                                  >
                                    {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(minute => (
                                      <option key={minute} value={minute}>{minute}</option>
                                    ))}
                                  </select>
                                  {/* AM/PM Dropdown */}
                                  <select
                                    value={hallTicketData[subject.id]?.examAmPm || 'AM'}
                                    onChange={(e) => updateHallTicketData(subject.id, 'examAmPm', e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={{ width: '60px' }}
                                  >
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                  </select>
                                </div>
                              </td>
                              {enableRoomNumbers && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <input
                                      type="text"
                                      value={hallTicketData[subject.id]?.roomNumber || ''}
                                      onChange={(e) => updateHallTicketData(subject.id, 'roomNumber', e.target.value)}
                                      placeholder="Room No."
                                      className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Students List */}
                {students.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Eligible Students ({students.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {students.map((student) => (
                        <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-sm text-blue-600 font-medium">Sequence ID: {student.sequenceId || student.rollNumber}</p>
                              <p className="text-xs text-gray-500">Class {student.className} - Section {student.section}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-xs">{(student.sequenceId || student.rollNumber).split('-').pop()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* School ID Card Generation Content */}
        {activeTab === 'idcard' && (
          <div>
            {/* Class, Section, and Template Selection */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Generate School ID Cards</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={idCardClass}
                    onChange={(e) => {
                      setIdCardClass(e.target.value);
                      setIdCardSection('');
                      setIdCardStudents([]);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a class...</option>
                    {classList.map(cls => (
                      <option key={cls} value={cls}>
                        Class {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={idCardSection}
                    onChange={(e) => {
                      setIdCardSection(e.target.value);
                      setIdCardStudents([]);
                    }}
                    disabled={!idCardClass}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Choose section...</option>
                    {idCardClass && getSectionsByClass(idCardClass).map(section => (
                      <option key={section.value} value={section.value}>
                        Section {section.section}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fetch Students Button */}
              <div className="mb-6">
                <button
                  onClick={fetchStudentsForIdCards}
                  disabled={!idCardClass || !idCardSection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Load Students
                </button>
              </div>

              {/* Orientation Selection */}
              {idCardStudents.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose ID Card Orientation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {idCardOrientations.map((orientation) => (
                      <div
                        key={orientation.id}
                        onClick={() => {
                          setSelectedOrientation(orientation.id);
                        }}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedOrientation === orientation.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="text-center">
                          <div className={`w-full h-24 rounded-lg mb-3 flex items-center justify-center ${orientation.id === 'landscape' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            {orientation.id === 'landscape' ? (
                              <RectangleHorizontal className="h-12 w-12 text-blue-600" />
                            ) : (
                              <RectangleVertical className="h-12 w-12 text-green-600" />
                            )}
                          </div>
                          <h4 className="font-semibold text-sm text-gray-800 mb-1">{orientation.name}</h4>
                          <p className="text-xs text-gray-600 mb-2">{orientation.description}</p>
                          <p className="text-xs text-gray-500">{orientation.preview}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigate to Preview Page */}
              {idCardStudents.length > 0 && selectedOrientation && (
                <div className="text-center">
                  <h4 className="font-medium text-gray-700 mb-3">Ready to Generate ID Cards</h4>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setShowPreview(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      <CreditCard className="h-5 w-5" />
                      Preview & Generate ID Cards ({idCardStudents.length} students)
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Preview individual cards and download as PNG images organized in folders
                  </p>
                </div>
              )}
            </div>

            {/* Students List */}
            {idCardStudents.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Eligible Students ({idCardStudents.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {idCardStudents.map((student) => (
                    <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-blue-600 font-medium">Sequence ID: {student.sequenceId || student.rollNumber}</p>
                          <p className="text-xs text-gray-500">Class {student.className} - Section {student.section}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-xs">{(student.sequenceId || student.rollNumber).split('-').pop()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AcademicDetails;
