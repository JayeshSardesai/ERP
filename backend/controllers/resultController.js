const Result = require('../models/Result');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const { gradeSystem, gradeUtils } = require('../utils/gradeSystem');

// Create or update student result with comprehensive grade calculation
exports.createOrUpdateResult = async (req, res) => {
  try {
    const {
      studentId,
      class: grade,
      section,
      academicYear,
      examType,
      subjects,
      overallGrade,
      remarks
    } = req.body;

    const schoolCode = req.user.schoolCode;
    const schoolId = req.user.schoolId;

    // Validate required fields
    if (!studentId || !grade || !section || !examType || !subjects || subjects.length === 0) {
      return res.status(400).json({
        message: 'Student ID, class, section, exam type, and subjects are required'
      });
    }

    // Validate student
    const student = await User.findOne({
      _id: studentId,
      role: 'student',
      schoolCode,
      isActive: true
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Validate class
    const classDoc = await Class.findOne({
      schoolCode,
      grade,
      section,
      academicYear: academicYear || '2024-25'
    });

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Get grade-specific grading system
    const gradingSystem = gradeUtils.getGradingSystem(grade);
    if (!gradingSystem) {
      return res.status(400).json({ message: 'Invalid grade level' });
    }

    // Process and validate subjects
    const processedSubjects = await processSubjectMarks(subjects, grade, gradingSystem, schoolCode);
    
    // Calculate overall statistics
    const overallStats = calculateOverallStatistics(processedSubjects, gradingSystem);

    // Find existing result or create new
    let result = await Result.findOne({
      schoolCode,
      studentId,
      academicYear: academicYear || '2024-25',
      'examDetails.examType': examType,
      'classDetails.grade': grade,
      'classDetails.section': section
    });

    const resultData = {
      schoolId,
      schoolCode,
      studentId,
      studentDetails: {
        studentName: `${student.name.firstName} ${student.name.lastName}`,
        rollNumber: student.studentDetails?.rollNumber || '',
        admissionNumber: student.studentDetails?.admissionNumber || '',
        parentName: student.parentDetails?.fatherName || '',
        parentContact: student.parentDetails?.mobileNumber || ''
      },
      classDetails: {
        grade,
        section,
        classSection: `${grade}${section}`,
        stream: classDoc.stream || null,
        academicYear: academicYear || '2024-25'
      },
      examDetails: {
        examType,
        examDate: new Date(),
        maxMarks: processedSubjects.reduce((sum, s) => sum + (s.maxMarks || 100), 0),
        resultDate: new Date()
      },
      subjects: processedSubjects,
      overallResult: {
        totalMarks: overallStats.totalMarks,
        maxMarks: overallStats.maxMarks,
        percentage: overallStats.percentage,
        grade: overallStats.grade,
        gradePoint: overallStats.gradePoint,
        status: overallStats.status,
        rank: null, // Will be calculated separately
        remarks: remarks || ''
      },
      gradingSystem: {
        type: gradingSystem.type,
        scale: gradingSystem.scale,
        grades: gradingSystem.grades
      },
      isActive: true,
      publishedAt: new Date(),
      createdBy: req.user._id,
      lastModifiedBy: req.user._id
    };

    if (result) {
      // Update existing result
      Object.assign(result, resultData);
      result.lastModified = new Date();
      await result.save();
    } else {
      // Create new result
      result = new Result(resultData);
      await result.save();
    }

    // Calculate rank among classmates
    await calculateClassRank(result, schoolCode, grade, section, examType, academicYear || '2024-25');

    res.status(result.isNew ? 201 : 200).json({
      success: true,
      message: result.isNew ? 'Result created successfully' : 'Result updated successfully',
      result: {
        id: result._id,
        resultId: result.resultId,
        studentName: result.studentDetails.studentName,
        classSection: result.classDetails.classSection,
        examType: result.examDetails.examType,
        percentage: result.overallResult.percentage,
        grade: result.overallResult.grade,
        status: result.overallResult.status,
        rank: result.overallResult.rank
      }
    });

  } catch (error) {
    console.error('Error creating/updating result:', error);
    res.status(500).json({ message: 'Error processing result', error: error.message });
  }
};

// Process subject marks with grade calculation
const processSubjectMarks = async (subjects, grade, gradingSystem, schoolCode) => {
  const processedSubjects = [];

  for (let subjectData of subjects) {
    const {
      subjectCode,
      marksObtained,
      maxMarks = 100,
      practicalMarks = 0,
      maxPracticalMarks = 0,
      isOptional = false
    } = subjectData;

    // Validate subject exists for the grade
    const subject = await Subject.findOne({
      schoolCode,
      subjectCode,
      'applicableGrades.grade': grade,
      isActive: true
    });

    if (!subject) {
      throw new Error(`Subject ${subjectCode} not found for grade ${grade}`);
    }

    // Calculate total marks
    const totalMarks = (marksObtained || 0) + (practicalMarks || 0);
    const totalMaxMarks = (maxMarks || 100) + (maxPracticalMarks || 0);
    const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    // Calculate grade using grading system
    const subjectGrade = calculateGrade(percentage, gradingSystem);

    processedSubjects.push({
      subjectCode,
      subjectName: subject.subjectName,
      subjectType: subject.subjectType,
      isOptional,
      theory: {
        marksObtained: marksObtained || 0,
        maxMarks: maxMarks || 100,
        percentage: maxMarks > 0 ? ((marksObtained || 0) / maxMarks) * 100 : 0
      },
      practical: {
        marksObtained: practicalMarks || 0,
        maxMarks: maxPracticalMarks || 0,
        percentage: maxPracticalMarks > 0 ? (practicalMarks / maxPracticalMarks) * 100 : 0
      },
      total: {
        marksObtained: totalMarks,
        maxMarks: totalMaxMarks,
        percentage: percentage,
        grade: subjectGrade.grade,
        gradePoint: subjectGrade.gradePoint,
        status: subjectGrade.status
      },
      teacherRemarks: subjectData.teacherRemarks || ''
    });
  }

  return processedSubjects;
};

// Calculate overall statistics
const calculateOverallStatistics = (subjects, gradingSystem) => {
  const totalMarks = subjects.reduce((sum, s) => sum + s.total.marksObtained, 0);
  const maxMarks = subjects.reduce((sum, s) => sum + s.total.maxMarks, 0);
  const percentage = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;

  const overallGrade = calculateGrade(percentage, gradingSystem);

  return {
    totalMarks,
    maxMarks,
    percentage: Math.round(percentage * 100) / 100,
    grade: overallGrade.grade,
    gradePoint: overallGrade.gradePoint,
    status: overallGrade.status
  };
};

// Calculate grade based on percentage
const calculateGrade = (percentage, gradingSystem) => {
  for (let grade of gradingSystem.grades) {
    if (percentage >= grade.minPercentage && percentage <= grade.maxPercentage) {
      return {
        grade: grade.grade,
        gradePoint: grade.gradePoint,
        status: grade.grade === 'F' ? 'fail' : 'pass'
      };
    }
  }

  // Default to fail if no grade found
  return {
    grade: 'F',
    gradePoint: 0,
    status: 'fail'
  };
};

// Calculate class rank
const calculateClassRank = async (currentResult, schoolCode, grade, section, examType, academicYear) => {
  try {
    // Get all results for the same class, section, and exam
    const classResults = await Result.find({
      schoolCode,
      'classDetails.grade': grade,
      'classDetails.section': section,
      'examDetails.examType': examType,
      'classDetails.academicYear': academicYear,
      isActive: true
    }).sort({ 'overallResult.percentage': -1 });

    // Update ranks
    for (let i = 0; i < classResults.length; i++) {
      const result = classResults[i];
      result.overallResult.rank = i + 1;
      result.overallResult.totalStudents = classResults.length;
      await result.save();
    }

  } catch (error) {
    console.error('Error calculating class rank:', error);
  }
};

// Get student result history
exports.getStudentResultHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, examType } = req.query;

    const schoolCode = req.user.schoolCode;

    // Build query
    const query = {
      schoolCode,
      studentId,
      isActive: true
    };

    if (academicYear) query['classDetails.academicYear'] = academicYear;
    if (examType) query['examDetails.examType'] = examType;

    const results = await Result.find(query)
      .sort({ 'examDetails.examDate': -1 })
      .select({
        resultId: 1,
        'classDetails.grade': 1,
        'classDetails.section': 1,
        'examDetails.examType': 1,
        'examDetails.examDate': 1,
        'overallResult.percentage': 1,
        'overallResult.grade': 1,
        'overallResult.status': 1,
        'overallResult.rank': 1,
        'overallResult.totalStudents': 1
      });

    // Calculate progress trend
    const progressTrend = calculateProgressTrend(results);

    res.json({
      success: true,
      studentId,
      resultCount: results.length,
      results,
      progressTrend
    });

  } catch (error) {
    console.error('Error fetching student result history:', error);
    res.status(500).json({ message: 'Error fetching result history', error: error.message });
  }
};

// Calculate progress trend
const calculateProgressTrend = (results) => {
  if (results.length < 2) return { trend: 'insufficient_data' };

  const latest = results[0];
  const previous = results[1];

  const improvement = latest.overallResult.percentage - previous.overallResult.percentage;

  return {
    trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable',
    improvement: Math.round(improvement * 100) / 100,
    latestPercentage: latest.overallResult.percentage,
    previousPercentage: previous.overallResult.percentage
  };
};

// Generate class performance report
exports.generateClassPerformanceReport = async (req, res) => {
  try {
    const { grade, section } = req.params;
    const { academicYear, examType } = req.query;

    const schoolCode = req.user.schoolCode;

    // Get all results for the class
    const results = await Result.find({
      schoolCode,
      'classDetails.grade': grade,
      'classDetails.section': section,
      'classDetails.academicYear': academicYear || '2024-25',
      'examDetails.examType': examType,
      isActive: true
    }).populate('studentId', 'name');

    if (results.length === 0) {
      return res.status(404).json({ message: 'No results found for the specified criteria' });
    }

    // Calculate class statistics
    const classStats = calculateClassStatistics(results);

    // Generate subject-wise analysis
    const subjectAnalysis = generateSubjectAnalysis(results);

    // Find top performers
    const topPerformers = results
      .sort((a, b) => b.overallResult.percentage - a.overallResult.percentage)
      .slice(0, 5)
      .map(r => ({
        studentId: r.studentId._id,
        studentName: `${r.studentId.name.firstName} ${r.studentId.name.lastName}`,
        percentage: r.overallResult.percentage,
        grade: r.overallResult.grade,
        rank: r.overallResult.rank
      }));

    // Generate grade distribution
    const gradeDistribution = generateGradeDistribution(results);

    res.json({
      success: true,
      classDetails: {
        grade,
        section,
        academicYear: academicYear || '2024-25',
        examType,
        totalStudents: results.length
      },
      classStatistics: classStats,
      subjectAnalysis,
      topPerformers,
      gradeDistribution
    });

  } catch (error) {
    console.error('Error generating class performance report:', error);
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
};

// Calculate class statistics
const calculateClassStatistics = (results) => {
  const percentages = results.map(r => r.overallResult.percentage);
  const total = percentages.reduce((sum, p) => sum + p, 0);
  
  return {
    averagePercentage: Math.round((total / percentages.length) * 100) / 100,
    highestPercentage: Math.max(...percentages),
    lowestPercentage: Math.min(...percentages),
    passCount: results.filter(r => r.overallResult.status === 'pass').length,
    failCount: results.filter(r => r.overallResult.status === 'fail').length,
    passPercentage: Math.round((results.filter(r => r.overallResult.status === 'pass').length / results.length) * 10000) / 100
  };
};

// Generate subject-wise analysis
const generateSubjectAnalysis = (results) => {
  const subjectStats = {};

  // Collect all subject data
  results.forEach(result => {
    result.subjects.forEach(subject => {
      if (!subjectStats[subject.subjectCode]) {
        subjectStats[subject.subjectCode] = {
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          percentages: [],
          passCount: 0,
          failCount: 0
        };
      }

      subjectStats[subject.subjectCode].percentages.push(subject.total.percentage);
      if (subject.total.status === 'pass') {
        subjectStats[subject.subjectCode].passCount++;
      } else {
        subjectStats[subject.subjectCode].failCount++;
      }
    });
  });

  // Calculate statistics for each subject
  Object.keys(subjectStats).forEach(subjectCode => {
    const subject = subjectStats[subjectCode];
    const total = subject.percentages.reduce((sum, p) => sum + p, 0);
    
    subject.averagePercentage = Math.round((total / subject.percentages.length) * 100) / 100;
    subject.highestPercentage = Math.max(...subject.percentages);
    subject.lowestPercentage = Math.min(...subject.percentages);
    subject.passPercentage = Math.round((subject.passCount / subject.percentages.length) * 10000) / 100;
    
    // Remove raw percentages array
    delete subject.percentages;
  });

  return subjectStats;
};

// Generate grade distribution
const generateGradeDistribution = (results) => {
  const distribution = {};

  results.forEach(result => {
    const grade = result.overallResult.grade;
    distribution[grade] = (distribution[grade] || 0) + 1;
  });

  return distribution;
};

// Helper function to calculate grade based on standard CBSE/ICSE grading scheme
const calculateSimpleGrade = (obtainedMarks, totalMarks) => {
  if (obtainedMarks === null || obtainedMarks === undefined || !totalMarks || totalMarks === 0) return null;
  
  const percentage = (obtainedMarks / totalMarks) * 100;
  
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

// Simple save results endpoint for the Results page
exports.saveResults = async (req, res) => {
  try {
    const {
      schoolCode,
      class: className,
      section,
      testType,
      subject,
      maxMarks,
      academicYear,
      results
    } = req.body;

    console.log('💾 Saving results:', { schoolCode, className, section, testType, subject, maxMarks, resultsCount: results?.length });

    // Validate required fields
    if (!schoolCode || !className || !section || !testType || !subject || !results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: schoolCode, class, section, testType, subject, and results array'
      });
    }

    // Get school-specific database connection
    const DatabaseManager = require('../utils/databaseManager');
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');

    const savedResults = [];
    const errors = [];

    // Process each student result
    for (const result of results) {
      try {
        const studentId = result.studentId;
        const obtainedMarks = result.obtainedMarks !== null && result.obtainedMarks !== undefined 
          ? parseInt(result.obtainedMarks) 
          : null;

        // Find existing result document for this student, class, section, and academic year
        const existingResult = await resultsCollection.findOne({
          schoolCode: schoolCode.toUpperCase(),
          className,
          section,
          academicYear: academicYear || '2024-25',
          studentId
        });

        const now = new Date();

        if (existingResult) {
          // Update existing document - add or update the subject entry
          const subjectIndex = existingResult.subjects?.findIndex(
            s => s.subjectName === subject && s.testType === testType
          );

          // Check if the subject is frozen
          if (subjectIndex >= 0 && existingResult.subjects[subjectIndex].frozen) {
            errors.push({
              studentId: result.studentId,
              studentName: result.studentName,
              error: 'Results are frozen and cannot be modified'
            });
            continue; // Skip this student
          }

          let updatedSubjects = existingResult.subjects || [];

          const totalMarksValue = parseInt(result.totalMarks || maxMarks);
          const calculatedGrade = calculateSimpleGrade(obtainedMarks, totalMarksValue);
          const calculatedPercentage = obtainedMarks !== null && totalMarksValue > 0 
            ? Math.round((obtainedMarks / totalMarksValue) * 100 * 100) / 100 
            : null;

          if (subjectIndex >= 0) {
            // Update existing subject entry (preserve frozen status)
            updatedSubjects[subjectIndex] = {
              subjectName: subject,
              testType,
              maxMarks: parseInt(maxMarks),
              obtainedMarks,
              totalMarks: totalMarksValue,
              grade: calculatedGrade,
              percentage: calculatedPercentage,
              updatedAt: now
            };
          } else {
            // Add new subject entry
            updatedSubjects.push({
              subjectName: subject,
              testType,
              maxMarks: parseInt(maxMarks),
              obtainedMarks,
              totalMarks: totalMarksValue,
              grade: calculatedGrade,
              percentage: calculatedPercentage,
              createdAt: now,
              updatedAt: now
            });
          }

          // Update the document
          await resultsCollection.updateOne(
            { _id: existingResult._id },
            {
              $set: {
                subjects: updatedSubjects,
                updatedAt: now,
                updatedBy: req.user?._id || null
              }
            }
          );

          savedResults.push({
            studentId,
            studentName: result.studentName,
            userId: result.userId,
            action: 'updated'
          });
        } else {
          // Create new result document
          const totalMarksValue = parseInt(result.totalMarks || maxMarks);
          const calculatedGrade = calculateSimpleGrade(obtainedMarks, totalMarksValue);
          const calculatedPercentage = obtainedMarks !== null && totalMarksValue > 0 
            ? Math.round((obtainedMarks / totalMarksValue) * 100 * 100) / 100 
            : null;

          const newResult = {
            schoolCode: schoolCode.toUpperCase(),
            className,
            section,
            academicYear: academicYear || '2024-25',
            studentId,
            studentName: result.studentName,
            userId: result.userId,
            subjects: [{
              subjectName: subject,
              testType,
              maxMarks: parseInt(maxMarks),
              obtainedMarks,
              totalMarks: totalMarksValue,
              grade: calculatedGrade,
              percentage: calculatedPercentage,
              createdAt: now,
              updatedAt: now
            }],
            createdAt: now,
            updatedAt: now,
            createdBy: req.user?._id || null
          };

          await resultsCollection.insertOne(newResult);

          savedResults.push({
            studentId,
            studentName: result.studentName,
            userId: result.userId,
            action: 'created'
          });
        }
      } catch (err) {
        console.error(`Error saving result for student ${result.studentId}:`, err);
        errors.push({
          studentId: result.studentId,
          studentName: result.studentName,
          error: err.message
        });
      }
    }

    console.log(`✅ Saved ${savedResults.length} results to school_${schoolCode.toLowerCase()}.results`);
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} errors occurred:`, errors);
    }

    res.json({
      success: true,
      message: `Successfully saved ${savedResults.length} results${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      data: {
        schoolCode,
        className,
        section,
        testType,
        subject,
        savedCount: savedResults.length,
        results: savedResults,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error saving results:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving results',
      error: error.message
    });
  }
};

// Get existing results for a class and section
exports.getResults = async (req, res) => {
  try {
    const { schoolCode, class: className, section, subject, testType, academicYear } = req.query;

    console.log('🔍 Fetching results:', { schoolCode, className, section, subject, testType, academicYear });

    if (!schoolCode || !className || !section) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: schoolCode, class, and section'
      });
    }

    // Get school-specific database connection
    const DatabaseManager = require('../utils/databaseManager');
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');

    // Build query for student documents
    const query = {
      schoolCode: schoolCode.toUpperCase(),
      className,
      section
    };

    if (academicYear) {
      query.academicYear = academicYear;
    }

    // Fetch all result documents for the class/section
    const resultDocs = await resultsCollection.find(query).sort({ createdAt: -1 }).toArray();

    console.log(`📚 Found ${resultDocs.length} student result documents for ${className}-${section}`);

    // Extract subject-specific results
    const filteredResults = [];

    for (const doc of resultDocs) {
      // Handle NESTED structure (new format with subjects array)
      if (doc.subjects && Array.isArray(doc.subjects)) {
        // Filter subjects array based on subject and testType
        let matchingSubjects = doc.subjects;

        if (subject) {
          matchingSubjects = matchingSubjects.filter(s => s.subjectName === subject);
        }

        if (testType) {
          matchingSubjects = matchingSubjects.filter(s => s.testType === testType);
        }

        // If we have matching subjects, create result entries
        for (const subj of matchingSubjects) {
          filteredResults.push({
            _id: doc._id,
            schoolCode: doc.schoolCode,
            className: doc.className,
            section: doc.section,
            academicYear: doc.academicYear,
            studentId: doc.studentId,
            studentName: doc.studentName,
            userId: doc.userId,
            subject: subj.subjectName,
            testType: subj.testType,
            maxMarks: subj.maxMarks,
            obtainedMarks: subj.obtainedMarks,
            totalMarks: subj.totalMarks,
            grade: subj.grade,
            percentage: subj.percentage,
            frozen: subj.frozen || false,
            frozenAt: subj.frozenAt || null,
            frozenBy: subj.frozenBy || null,
            createdAt: subj.createdAt || doc.createdAt,
            updatedAt: subj.updatedAt || doc.updatedAt
          });
        }
      } 
      // Handle FLAT structure (old format - backward compatibility)
      else if (doc.testType && doc.obtainedMarks !== undefined) {
        // Check if this document matches the filters
        const matchesSubject = !subject || doc.subject === subject;
        const matchesTestType = !testType || doc.testType === testType;

        if (matchesSubject && matchesTestType) {
          filteredResults.push({
            _id: doc._id,
            schoolCode: doc.schoolCode,
            className: doc.className,
            section: doc.section,
            academicYear: doc.academicYear,
            studentId: doc.studentId,
            studentName: doc.studentName,
            userId: doc.userId,
            subject: doc.subject || 'Unknown',
            testType: doc.testType,
            maxMarks: doc.maxMarks,
            obtainedMarks: doc.obtainedMarks,
            totalMarks: doc.totalMarks,
            grade: doc.grade,
            percentage: doc.percentage,
            frozen: doc.frozen || false,
            frozenAt: doc.frozenAt || null,
            frozenBy: doc.frozenBy || null,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          });
        }
      }
    }

    console.log(`✅ Found ${filteredResults.length} subject-specific results for ${className}-${section}${subject ? ` (${subject})` : ''}${testType ? ` (${testType})` : ''}`);

    res.json({
      success: true,
      message: `Found ${filteredResults.length} results`,
      data: filteredResults
    });

  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results',
      error: error.message
    });
  }
};

// Update a single student result
exports.updateResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    const {
      schoolCode,
      class: className,
      section,
      subject,
      testType,
      maxMarks,
      obtainedMarks,
      totalMarks,
      studentId,
      studentName,
      userId
    } = req.body;

    console.log('🔄 Updating result:', { resultId, schoolCode, className, section, subject, testType });

    if (!resultId || !schoolCode || !className || !section || !subject || !testType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get school-specific database connection
    const DatabaseManager = require('../utils/databaseManager');
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');
    const { ObjectId } = require('mongodb');

    // Find the result document
    const existingResult = await resultsCollection.findOne({
      _id: new ObjectId(resultId)
    });

    if (!existingResult) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    const now = new Date();
    const obtainedMarksValue = obtainedMarks !== null && obtainedMarks !== undefined 
      ? parseInt(obtainedMarks) 
      : null;

    // Find and update the specific subject entry
    const subjectIndex = existingResult.subjects?.findIndex(
      s => s.subjectName === subject && s.testType === testType
    );

    // Check if the subject is frozen
    if (subjectIndex >= 0 && existingResult.subjects[subjectIndex].frozen) {
      return res.status(403).json({
        success: false,
        message: 'Cannot update frozen results. Results have been locked and cannot be modified.'
      });
    }

    let updatedSubjects = existingResult.subjects || [];

    if (subjectIndex >= 0) {
      // Update existing subject entry (preserve frozen status)
      updatedSubjects[subjectIndex] = {
        subjectName: subject,
        testType,
        maxMarks: parseInt(maxMarks),
        obtainedMarks: obtainedMarksValue,
        totalMarks: parseInt(totalMarks || maxMarks),
        grade: req.body.grade || null,
        percentage: obtainedMarksValue !== null && totalMarks > 0 
          ? Math.round((obtainedMarksValue / totalMarks) * 100 * 100) / 100 
          : null,
        updatedAt: now
      };
    } else {
      // Add new subject entry if not found
      updatedSubjects.push({
        subjectName: subject,
        testType,
        maxMarks: parseInt(maxMarks),
        obtainedMarks: obtainedMarksValue,
        totalMarks: parseInt(totalMarks || maxMarks),
        grade: req.body.grade || null,
        percentage: obtainedMarksValue !== null && totalMarks > 0 
          ? Math.round((obtainedMarksValue / totalMarks) * 100 * 100) / 100 
          : null,
        createdAt: now,
        updatedAt: now
      });
    }

    // Update the document
    const updateResult = await resultsCollection.updateOne(
      { _id: new ObjectId(resultId) },
      {
        $set: {
          subjects: updatedSubjects,
          updatedAt: now,
          updatedBy: req.user?._id || null
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes made to the result'
      });
    }

    console.log(`✅ Updated result ${resultId} for subject ${subject}, test ${testType}`);

    res.json({
      success: true,
      message: 'Result updated successfully',
      data: {
        resultId,
        subject,
        testType,
        obtainedMarks: obtainedMarksValue
      }
    });

  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating result',
      error: error.message
    });
  }
};

// Freeze results for a specific class, section, subject, and test type
exports.freezeResults = async (req, res) => {
  try {
    const {
      schoolCode,
      class: className,
      section,
      subject,
      testType,
      academicYear
    } = req.body;

    console.log('🔒 Freezing results:', { schoolCode, className, section, subject, testType });

    // Validate required fields
    if (!schoolCode || !className || !section || !subject || !testType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: schoolCode, class, section, subject, and testType'
      });
    }

    // Get school-specific database connection
    const DatabaseManager = require('../utils/databaseManager');
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');

    const now = new Date();

    // Update all matching results to set frozen status
    const updateResult = await resultsCollection.updateMany(
      {
        schoolCode: schoolCode.toUpperCase(),
        className,
        section,
        academicYear: academicYear || '2024-25',
        'subjects.subjectName': subject,
        'subjects.testType': testType
      },
      {
        $set: {
          'subjects.$[elem].frozen': true,
          'subjects.$[elem].frozenAt': now,
          'subjects.$[elem].frozenBy': req.user?._id || null,
          updatedAt: now
        }
      },
      {
        arrayFilters: [{ 'elem.subjectName': subject, 'elem.testType': testType }]
      }
    );

    console.log(`✅ Frozen ${updateResult.modifiedCount} results for ${className}-${section}, ${subject} (${testType})`);

    res.json({
      success: true,
      message: `Successfully frozen ${updateResult.modifiedCount} results`,
      data: {
        schoolCode,
        className,
        section,
        subject,
        testType,
        frozenCount: updateResult.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error freezing results:', error);
    res.status(500).json({
      success: false,
      message: 'Error freezing results',
      error: error.message
    });
  }
};

module.exports = {
  createOrUpdateResult: exports.createOrUpdateResult,
  getStudentResultHistory: exports.getStudentResultHistory,
  generateClassPerformanceReport: exports.generateClassPerformanceReport,
  saveResults: exports.saveResults,
  getResults: exports.getResults,
  updateResult: exports.updateResult,
  freezeResults: exports.freezeResults
};
