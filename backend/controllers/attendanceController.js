const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const School = require('../models/School');
const DatabaseOptimization = require('../utils/databaseOptimization');
const UserGenerator = require('../utils/userGenerator');

// Enhanced attendance marking with multiple methods and tracking
exports.markAttendance = async (req, res) => {
  try {
    const {
      studentId,
      class: className,
      section,
      date,
      status,
      attendanceType = 'daily',
      method = 'manual',
      deviceId,
      location,
      periods,
      leaveDetails,
      lateDetails,
      teacherNotes
    } = req.body;

    // Check if user is admin or teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolCode = req.user.schoolCode;
    const schoolId = req.user.schoolId;
    
    // Get student information
    const student = await UserGenerator.getUserByIdOrEmail(schoolCode, studentId);
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if attendance already exists for this student-date
    let attendance = await Attendance.findOne({
      schoolCode,
      studentId,
      date: new Date(date)
    });

    const currentTime = new Date();
    const attendanceData = {
      schoolId,
      schoolCode,
      studentId,
      studentName: `${student.name.firstName} ${student.name.lastName}`,
      studentRollNumber: student.studentDetails?.rollNumber,
      class: className,
      section,
      date: new Date(date),
      status,
      attendanceType,
      timeTracking: {
        schoolStartTime: '08:00',
        schoolEndTime: '15:30'
      }
    };

    // Set check-in/check-out based on status
    if (status === 'present' || status === 'late') {
      attendanceData.timeTracking.checkIn = {
        time: currentTime.toTimeString().slice(0, 5),
        timestamp: currentTime,
        method,
        recordedBy: req.user._id,
        deviceId,
        location
      };
    }

    // Add period-wise attendance if provided
    if (periods && periods.length > 0) {
      attendanceData.timeTracking.periods = periods.map(period => ({
        ...period,
        markedAt: new Date(),
        markedBy: req.user._id
      }));
      
      // Calculate totals
      attendanceData.timeTracking.totalPeriodsScheduled = periods.length;
      attendanceData.timeTracking.totalPeriodsPresent = periods.filter(p => p.status === 'present').length;
    }

    // Add leave details if absent
    if (status === 'absent' && leaveDetails) {
      attendanceData.leaveDetails = {
        ...leaveDetails,
        appliedBy: leaveDetails.appliedBy || req.user._id,
        appliedAt: new Date()
      };
    }

    // Add late details if late
    if (status === 'late' && lateDetails) {
      attendanceData.lateDetails = lateDetails;
    }

    // Add teacher notes
    if (teacherNotes) {
      attendanceData.teacherNotes = [{
        teacherId: req.user._id,
        teacherName: `${req.user.name.firstName} ${req.user.name.lastName}`,
        note: teacherNotes,
        timestamp: new Date()
      }];
    }

    if (attendance) {
      // Update existing attendance
      if (attendance.isLocked) {
        return res.status(400).json({ message: 'Attendance is locked and cannot be modified' });
      }

      // Track modifications
      const modifications = [];
      if (attendance.status !== status) {
        modifications.push({
          field: 'status',
          oldValue: attendance.status,
          newValue: status,
          modifiedBy: req.user._id,
          modifiedAt: new Date(),
          reason: 'Status update'
        });
      }

      // Update attendance
      Object.assign(attendance, attendanceData);
      attendance.modifications = [...(attendance.modifications || []), ...modifications];
      attendance.lastModifiedBy = req.user._id;
      attendance.lastModifiedAt = new Date();

    } else {
      // Create new attendance record
      attendanceData.createdBy = req.user._id;
      attendanceData.createdAt = new Date();
      attendance = new Attendance(attendanceData);
    }

    await attendance.save();

    // Send parent notification for absence or late arrival
    if (status === 'absent' || status === 'late') {
      await sendParentNotification(attendance, student);
    }

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: {
        attendanceId: attendance.attendanceId,
        studentName: attendance.studentName,
        status: attendance.status,
        date: attendance.date,
        timeTracking: attendance.timeTracking
      }
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Session-based bulk attendance marking (morning/afternoon)
exports.markSessionAttendance = async (req, res) => {
  try {
    const {
      date,
      class: className,
      section,
      session, // 'morning' or 'afternoon'
      students // Array of { studentId, userId, status }
    } = req.body;

    // Check permissions
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolCode = req.user.schoolCode;
    const schoolId = req.user.schoolId;
    const results = [];
    const sessionTime = session === 'morning' ? '08:00' : '13:00';
    const markedBy = req.user.name || req.user.userId;

    console.log(`🎯 Processing ${session} attendance for Class ${className} Section ${section} on ${date}`);
    console.log(`👥 Students to process: ${students.length}`);
    console.log(`🏫 School code: ${schoolCode}, School ID: ${schoolId}`);
    console.log(`👤 Marked by: ${markedBy} (${req.user.role})`);

    // Fetch school's current academic year
    const school = await School.findOne({ code: schoolCode });
    const currentAcademicYear = school?.settings?.academicYear?.currentYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    console.log(`📅 Using academic year: ${currentAcademicYear}`);

    // Use school-specific database for attendance storage
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Create the session attendance document ID
    const sessionDocumentId = `${date}_${className}_${section}_${session}`;
    
    // Check if attendance is already marked (frozen) for this session
    const existingSession = await attendanceCollection.findOne({ _id: sessionDocumentId });
    if (existingSession) {
      console.log(`🔒 Attendance already marked and frozen for ${session} session`);
      return res.status(400).json({
        success: false,
        message: `${session.charAt(0).toUpperCase() + session.slice(1)} attendance has already been marked and is frozen. Cannot modify existing attendance.`,
        data: {
          date,
          class: className,
          section,
          session,
          isFrozen: true,
          existingDocument: {
            documentId: sessionDocumentId,
            markedAt: existingSession.markedAt,
            markedBy: existingSession.markedBy,
            totalStudents: existingSession.totalStudents,
            progress: existingSession.progress
          }
        }
      });
    }
    
    // Process all students and collect their data
    const processedStudents = [];
    let successCount = 0;
    let failCount = 0;

    for (const studentData of students) {
      try {
        console.log(`🔍 Processing student: ${studentData.userId || studentData.studentId} with status: ${studentData.status}`);
        
        // Validate required fields
        if (!studentData.studentId || !studentData.status) {
          console.log(`❌ Missing data for student: ${JSON.stringify(studentData)}`);
          failCount++;
          continue;
        }

        // Validate status - only 'present' or 'absent' allowed
        if (!['present', 'absent'].includes(studentData.status)) {
          console.log(`❌ Invalid status '${studentData.status}' for student: ${studentData.studentId}`);
          failCount++;
          continue;
        }

        // Get student information using UserGenerator
        console.log(`🔎 Looking up student: ${studentData.studentId} in school: ${schoolCode}`);
        const student = await UserGenerator.getUserByIdOrEmail(schoolCode, studentData.studentId);

        if (!student || student.role !== 'student') {
          console.log(`❌ Student not found or not a student: ${studentData.studentId}`);
          failCount++;
          continue;
        }

        console.log(`✅ Found student: ${student.name?.displayName || student.name} (${student.userId})`);

        // Add student data to the processed list
        processedStudents.push({
          studentId: student.userId, // "P-S-0997"
          studentName: student.name?.displayName || student.name,
          studentDetails: {
            firstName: student.name?.firstName || '',
            lastName: student.name?.lastName || '',
            displayName: student.name?.displayName || student.name
          },
          class: className,
          section: section,
          status: studentData.status, // "present" or "absent"
          markedAt: new Date(),
          rollNumber: student.studentDetails?.rollNumber || student.userId
        });

        successCount++;

      } catch (error) {
        console.error(`Error processing student ${studentData.studentId}:`, error);
        failCount++;
      }
    }

    // Create the single session attendance document
    const sessionAttendanceDocument = {
      // Document Identification
      _id: sessionDocumentId,
      documentType: 'session_attendance',
      
      // Session Information
      date: new Date(date),
      dateString: date, // "2025-09-07"
      session: session, // "morning" or "afternoon"
      dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      
      // Class Information
      class: className,
      section: section,
      classInfo: `${session.charAt(0).toUpperCase() + session.slice(1)} Attendance - Class ${className} Section ${section}`,
      
      // Progress Information
      totalStudents: students.length,
      processedStudents: processedStudents.length,
      successCount: successCount,
      failCount: failCount,
      progress: `${successCount}/${students.length} marked`,
      
      // All Students Data
      students: processedStudents,
      
      // Academic Information
      academicYear: currentAcademicYear,
      schoolCode: schoolCode,
      
      // Metadata
      createdAt: new Date(),
      createdBy: req.user._id || req.user.userId,
      markedBy: markedBy,
      markedByRole: req.user.role,
      
      // Session Timing
      sessionTime: sessionTime,
      markedAt: new Date()
    };

    // Store the single document (upsert to handle updates)
    await attendanceCollection.replaceOne(
      { _id: sessionDocumentId },
      sessionAttendanceDocument,
      { upsert: true }
    );

    console.log(`✅ Stored ${session} attendance document for Class ${className} Section ${section}`);
    console.log(`📊 Document contains ${processedStudents.length} students`);

    // Create response results
    const responseResults = processedStudents.map(student => ({
      studentId: student.studentId,
      userId: student.studentId,
      success: true,
      message: `${session} attendance marked successfully`
    }));

    // Add failed students to response results
    const failedCount = students.length - successCount;
    for (let i = 0; i < failedCount; i++) {
      responseResults.push({
        studentId: `failed_${i}`,
        userId: `failed_${i}`,
        success: false,
        message: 'Failed to process student'
      });
    }

    console.log(`Attendance marking completed: ${successCount} successful, ${failCount} failed`);

    res.json({
      success: true,
      message: `${session.charAt(0).toUpperCase() + session.slice(1)} attendance marked successfully: ${successCount} students processed, ${failCount} failed`,
      data: {
        date,
        class: className,
        section,
        session,
        totalStudents: students.length,
        successCount,
        failCount,
        progress: `${successCount}/${students.length} marked`,
        documentId: sessionDocumentId,
        studentsData: processedStudents,
        results: responseResults
      }
    });

  } catch (error) {
    console.error('Error in markSessionAttendance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while marking attendance',
      error: error.message 
    });
  }
};

// Bulk attendance marking for entire class
exports.markBulkAttendance = async (req, res) => {
  try {
    const {
      class: className,
      section,
      date,
      students, // Array of { studentId, status, notes }
      academicYear,
      period,
      subject
    } = req.body;

    // Check permissions
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolCode = req.user.schoolCode;
    const results = [];

    for (const studentData of students) {
      try {
        const student = await User.findOne({ 
          _id: studentData.studentId, 
          role: 'student',
          schoolCode: schoolCode 
        });

        if (!student) {
          results.push({
            studentId: studentData.studentId,
            success: false,
            error: 'Student not found'
          });
          continue;
        }

        // Check if attendance already exists
        let attendance = await Attendance.findOne({
          schoolCode,
          studentId: studentData.studentId,
          date: new Date(date)
        });

        const attendanceData = {
          schoolId: req.user.schoolId,
          schoolCode,
          studentId: studentData.studentId,
          studentName: `${student.name.firstName} ${student.name.lastName}`,
          studentRollNumber: student.studentDetails?.rollNumber,
          class: className,
          section,
          date: new Date(date),
          status: studentData.status,
          attendanceType: 'daily',
          timeTracking: {
            schoolStartTime: '08:00',
            schoolEndTime: '15:30'
          },
          createdBy: req.user._id
        };

        // Add period information if provided
        if (period && subject) {
          attendanceData.timeTracking.periods = [{
            periodNumber: period,
            subjectName: subject,
            teacherId: req.user._id,
            teacherName: `${req.user.name.firstName} ${req.user.name.lastName}`,
            status: studentData.status,
            markedAt: new Date(),
            markedBy: req.user._id
          }];
        }

        // Add notes if provided
        if (studentData.notes) {
          attendanceData.teacherNotes = [{
            teacherId: req.user._id,
            teacherName: `${req.user.name.firstName} ${req.user.name.lastName}`,
            note: studentData.notes,
            timestamp: new Date()
          }];
        }

        if (attendance) {
          // Update existing
          Object.assign(attendance, attendanceData);
          attendance.lastModifiedBy = req.user._id;
          attendance.lastModifiedAt = new Date();
        } else {
          // Create new
          attendance = new Attendance(attendanceData);
        }

        await attendance.save();

        results.push({
          studentId: studentData.studentId,
          studentName: attendanceData.studentName,
          success: true,
          attendanceId: attendance.attendanceId
        });

        // Send notifications for absent students
        if (studentData.status === 'absent') {
          await sendParentNotification(attendance, student);
        }

      } catch (error) {
        results.push({
          studentId: studentData.studentId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Attendance marked: ${successCount} successful, ${failCount} failed`,
      results,
      summary: {
        total: students.length,
        successful: successCount,
        failed: failCount
      }
    });

  } catch (error) {
    console.error('Error marking bulk attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get attendance for a class
exports.getAttendance = async (req, res) => {
  try {
    const { class: className, section, date, startDate, endDate, session } = req.query;
    const schoolCode = req.user.schoolCode || 'P'; // Default fallback

    console.log(`📊 Getting attendance for Class ${className} Section ${section} Date ${date} Session ${session}`);

    // Check if user has access
    if (!['admin', 'teacher', 'student', 'parent'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use school-specific database for attendance retrieval
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    let attendanceDocuments = [];

    if (date && className && section) {
      // Get specific date attendance for both sessions
      const morningDocId = `${date}_${className}_${section}_morning`;
      const afternoonDocId = `${date}_${className}_${section}_afternoon`;

      const morningDoc = await attendanceCollection.findOne({ _id: morningDocId });
      const afternoonDoc = await attendanceCollection.findOne({ _id: afternoonDocId });

      if (morningDoc) attendanceDocuments.push(morningDoc);
      if (afternoonDoc) attendanceDocuments.push(afternoonDoc);

    } else if (date && session && className && section) {
      // Get specific session attendance
      const docId = `${date}_${className}_${section}_${session}`;
      const doc = await attendanceCollection.findOne({ _id: docId });
      if (doc) attendanceDocuments.push(doc);

    } else if (startDate && endDate && className && section) {
      // Get attendance for date range
      const query = {
        documentType: 'session_attendance',
        class: className,
        section: section,
        dateString: {
          $gte: startDate,
          $lte: endDate
        }
      };
      attendanceDocuments = await attendanceCollection.find(query).toArray();

    } else {
      // Get recent attendance (last 30 days) if no specific filters
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const query = {
        documentType: 'session_attendance',
        date: { $gte: thirtyDaysAgo }
      };
      
      if (className) query.class = className;
      if (section) query.section = section;
      
      attendanceDocuments = await attendanceCollection.find(query)
        .sort({ date: -1 })
        .limit(50)
        .toArray();
    }

    // Filter for students/parents (they can only see their own attendance)
    if (req.user.role === 'student') {
      attendanceDocuments = attendanceDocuments.map(doc => {
        const studentRecord = doc.students?.find(s => s.studentId === req.user.userId);
        if (studentRecord) {
          return {
            ...doc,
            students: [studentRecord], // Only show the student's own record
            totalStudents: 1,
            processedStudents: 1
          };
        }
        return null;
      }).filter(Boolean);
    }

    if (req.user.role === 'parent') {
      // Find child's studentId (this would need proper parent-child relationship lookup)
      const childStudentId = req.user.childStudentId; // This would need to be implemented
      attendanceDocuments = attendanceDocuments.map(doc => {
        const studentRecord = doc.students?.find(s => s.studentId === childStudentId);
        if (studentRecord) {
          return {
            ...doc,
            students: [studentRecord],
            totalStudents: 1,
            processedStudents: 1
          };
        }
        return null;
      }).filter(Boolean);
    }

    // Transform the data for frontend compatibility
    const transformedAttendance = attendanceDocuments.map(doc => ({
      _id: doc._id,
      date: doc.date,
      dateString: doc.dateString,
      class: doc.class,
      section: doc.section,
      session: doc.session,
      sessionTime: doc.sessionTime,
      dayOfWeek: doc.dayOfWeek,
      classInfo: doc.classInfo,
      totalStudents: doc.totalStudents,
      processedStudents: doc.processedStudents,
      successCount: doc.successCount,
      failCount: doc.failCount,
      progress: doc.progress,
      students: doc.students || [],
      academicYear: doc.academicYear,
      markedBy: doc.markedBy,
      markedByRole: doc.markedByRole,
      createdAt: doc.createdAt,
      markedAt: doc.markedAt,
      isFrozen: true, // All saved attendance is frozen (cannot be modified)
      canModify: false // Attendance cannot be modified once saved
    }));

    console.log(`✅ Found ${transformedAttendance.length} attendance sessions`);

    res.json({
      success: true,
      message: `Found ${transformedAttendance.length} attendance sessions`,
      data: transformedAttendance,
      totalSessions: transformedAttendance.length
    });

  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching attendance', 
      error: error.message 
    });
  }
};

// Check if attendance session is already marked (frozen)
exports.checkSessionStatus = async (req, res) => {
  try {
    const { class: className, section, date, session } = req.query;
    const schoolCode = req.user.schoolCode || 'P';

    console.log(`🔍 Checking session status for ${date}_${className}_${section}_${session}`);

    // Use school-specific database for attendance retrieval
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    const sessionDocumentId = `${date}_${className}_${section}_${session}`;
    const existingSession = await attendanceCollection.findOne({ _id: sessionDocumentId });

    if (existingSession) {
      // Session is marked and frozen
      res.json({
        success: true,
        isMarked: true,
        isFrozen: true,
        canModify: false,
        message: `${session.charAt(0).toUpperCase() + session.slice(1)} attendance is already marked and frozen`,
        data: {
          documentId: sessionDocumentId,
          markedAt: existingSession.markedAt,
          markedBy: existingSession.markedBy,
          totalStudents: existingSession.totalStudents,
          progress: existingSession.progress,
          session: existingSession.session,
          classInfo: existingSession.classInfo
        }
      });
    } else {
      // Session is not marked yet
      res.json({
        success: true,
        isMarked: false,
        isFrozen: false,
        canModify: true,
        message: `${session.charAt(0).toUpperCase() + session.slice(1)} attendance can be marked`,
        data: {
          documentId: sessionDocumentId,
          date,
          class: className,
          section,
          session
        }
      });
    }

  } catch (error) {
    console.error('Error checking session status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking session status', 
      error: error.message 
    });
  }
};

// Get daily attendance statistics for the last 7 days
exports.getDailyAttendanceStats = async (req, res) => {
  try {
    const { schoolCode } = req.query;

    // Check if user has access
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userSchoolCode = schoolCode || req.user.schoolCode;

    if (!userSchoolCode) {
      return res.status(400).json({ 
        success: false,
        message: 'School code is required' 
      });
    }

    // Use school-specific database for attendance
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(userSchoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Get last 7 days
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    console.log(`[DAILY STATS] Fetching attendance from ${sevenDaysAgo.toISOString()} to ${today.toISOString()}`);

    // Fetch attendance sessions for the last 7 days
    const sessions = await attendanceCollection.find({
      date: {
        $gte: sevenDaysAgo,
        $lte: today
      }
    }).toArray();

    console.log(`[DAILY STATS] Found ${sessions.length} sessions`);

    // Group by date and calculate daily attendance rate from students array
    const dailyMap = {};

    sessions.forEach(session => {
      const dateStr = session.dateString || new Date(session.date).toISOString().split('T')[0];
      
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          totalPresent: 0,
          totalAbsent: 0,
          totalHalfDay: 0
        };
      }

      // Count from students array if available
      if (session.students && Array.isArray(session.students)) {
        session.students.forEach(student => {
          const status = student.status?.toLowerCase();
          if (status === 'present') {
            dailyMap[dateStr].totalPresent++;
          } else if (status === 'absent') {
            dailyMap[dateStr].totalAbsent++;
          } else if (status === 'half-day' || status === 'halfday') {
            dailyMap[dateStr].totalHalfDay++;
          }
        });
      } else {
        // Fallback to successCount/failCount
        dailyMap[dateStr].totalPresent += (session.successCount || 0);
        dailyMap[dateStr].totalAbsent += (session.failCount || 0);
      }
    });

    // Calculate attendance rate for each day
    const dailyStats = Object.values(dailyMap).map(day => {
      const total = day.totalPresent + day.totalAbsent + day.totalHalfDay;
      const attendanceRate = total > 0 ? Math.round((day.totalPresent / total) * 100 * 10) / 10 : 0;
      
      return {
        date: day.date,
        totalPresent: day.totalPresent,
        totalAbsent: day.totalAbsent,
        totalHalfDay: day.totalHalfDay,
        totalRecords: total,
        attendanceRate
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`[DAILY STATS] Calculated stats for ${dailyStats.length} days`);

    res.json({
      success: true,
      dailyStats,
      period: {
        from: sevenDaysAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error fetching daily attendance stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching daily attendance stats', 
      error: error.message 
    });
  }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res) => {
  try {
    const { class: className, section, startDate, endDate, date } = req.query;

    // Check if user has access (more flexible role checking)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const schoolCode = req.user.schoolCode;
    
    // Build match query
    const matchQuery = {};
    if (className && className !== 'all') matchQuery.class = className;
    if (section) matchQuery.section = section;
    
    // Support single date query (for today's attendance)
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      matchQuery.date = {
        $gte: targetDate,
        $lt: nextDay
      };
    } else if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Use school-specific database for attendance
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Fetch all attendance session documents (morning and afternoon)
    const sessionDocs = await attendanceCollection.find(matchQuery).toArray();

    console.log(`[ATTENDANCE STATS] Found ${sessionDocs.length} session documents for school: ${schoolCode}`);

    if (sessionDocs.length === 0) {
      return res.json({
        success: true,
        totalSessions: 0,
        totalPresent: 0,
        totalAbsent: 0,
        presentCount: 0,
        absentCount: 0,
        totalRecords: 0,
        averageAttendance: 0,
        attendanceRate: '0.0%'
      });
    }

    // Calculate statistics from students array in each session document
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalSessions = sessionDocs.length;

    sessionDocs.forEach(doc => {
      // Count students by status from the students array
      if (doc.students && Array.isArray(doc.students)) {
        doc.students.forEach(student => {
          const status = student.status?.toLowerCase();
          if (status === 'present') {
            totalPresent++;
          } else if (status === 'absent') {
            totalAbsent++;
          } else if (status === 'half-day' || status === 'halfday') {
            totalHalfDay++;
          }
        });
        
        console.log(`[SESSION] ${doc.session || 'unknown'} on ${doc.dateString || doc.date}: ${doc.students.length} students - Present=${doc.students.filter(s => s.status?.toLowerCase() === 'present').length}, Absent=${doc.students.filter(s => s.status?.toLowerCase() === 'absent').length}`);
      } else {
        // Fallback to successCount/failCount if students array doesn't exist
        const present = doc.successCount || 0;
        const absent = doc.failCount || 0;
        
        totalPresent += present;
        totalAbsent += absent;
        
        console.log(`[SESSION FALLBACK] ${doc.session || 'unknown'} on ${doc.dateString || doc.date}: Present=${present}, Absent=${absent}`);
      }
    });

    const totalRecords = totalPresent + totalAbsent + totalHalfDay;
    const averageAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100 * 10) / 10 : 0;

    console.log(`[ATTENDANCE STATS] Total: ${totalRecords}, Present: ${totalPresent}, Absent: ${totalAbsent}, Half-Day: ${totalHalfDay}, Rate: ${averageAttendance}%`);

    res.json({
      success: true,
      totalSessions,
      totalPresent,
      totalAbsent,
      presentCount: totalPresent,
      absentCount: totalAbsent,
      totalRecords,
      averageAttendance,
      attendanceRate: `${averageAttendance}%`
    });

  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching attendance stats', 
      error: error.message 
    });
  }
};

// Get session-specific attendance data (morning or afternoon)
exports.getSessionAttendanceData = async (req, res) => {
  try {
    const { date, session } = req.query;

    // Check if user has access
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!date || !session) {
      return res.status(400).json({ 
        success: false,
        message: 'Date and session parameters are required' 
      });
    }

    if (!['morning', 'afternoon'].includes(session.toLowerCase())) {
      return res.status(400).json({ 
        success: false,
        message: 'Session must be either "morning" or "afternoon"' 
      });
    }

    const schoolCode = req.user.schoolCode;
    
    // Use school-specific database for attendance
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Build query for specific date and session
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const query = {
      date: {
        $gte: targetDate,
        $lt: nextDay
      },
      session: session.toLowerCase()
    };

    // Fetch session documents
    const sessionDocs = await attendanceCollection.find(query).toArray();

    console.log(`[SESSION DATA] Found ${sessionDocs.length} ${session} session documents for ${date}`);

    if (sessionDocs.length === 0) {
      return res.json({
        success: true,
        session: session.toLowerCase(),
        date,
        presentCount: 0,
        absentCount: 0,
        halfDayCount: 0,
        totalRecords: 0,
        attendanceRate: 0
      });
    }

    // Calculate statistics from students array
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;

    sessionDocs.forEach(doc => {
      if (doc.students && Array.isArray(doc.students)) {
        doc.students.forEach(student => {
          const status = student.status?.toLowerCase();
          if (status === 'present') {
            totalPresent++;
          } else if (status === 'absent') {
            totalAbsent++;
          } else if (status === 'half-day' || status === 'halfday') {
            totalHalfDay++;
          }
        });
      }
    });

    const totalRecords = totalPresent + totalAbsent + totalHalfDay;
    const attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100 * 10) / 10 : 0;

    console.log(`[SESSION DATA] ${session} - Present: ${totalPresent}, Absent: ${totalAbsent}, Half-Day: ${totalHalfDay}, Rate: ${attendanceRate}%`);

    res.json({
      success: true,
      session: session.toLowerCase(),
      date,
      presentCount: totalPresent,
      absentCount: totalAbsent,
      halfDayCount: totalHalfDay,
      totalRecords,
      attendanceRate,
      attendanceRateFormatted: `${attendanceRate}%`
    });

  } catch (error) {
    console.error('Error fetching session attendance data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching session attendance data', 
      error: error.message 
    });
  }
};

// Get overall attendance rate for all sessions, days, and sections
exports.getOverallAttendanceRate = async (req, res) => {
  try {
    // Check if user has access
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const schoolCode = req.user.schoolCode;
    
    // Use school-specific database for attendance
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Fetch ALL attendance session documents (no filters)
    const allSessionDocs = await attendanceCollection.find({}).toArray();

    console.log(`[OVERALL ATTENDANCE] Found ${allSessionDocs.length} total session documents for school: ${schoolCode}`);

    if (allSessionDocs.length === 0) {
      return res.json({
        success: true,
        totalSessions: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalHalfDay: 0,
        totalRecords: 0,
        overallAttendanceRate: 0,
        attendanceRateFormatted: '0.0%'
      });
    }

    // Calculate statistics from students array in ALL session documents
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;

    allSessionDocs.forEach(doc => {
      // Count students by status from the students array
      if (doc.students && Array.isArray(doc.students)) {
        doc.students.forEach(student => {
          const status = student.status?.toLowerCase();
          if (status === 'present') {
            totalPresent++;
          } else if (status === 'absent') {
            totalAbsent++;
          } else if (status === 'half-day' || status === 'halfday') {
            totalHalfDay++;
          }
        });
      }
    });

    const totalRecords = totalPresent + totalAbsent + totalHalfDay;
    const overallAttendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100 * 10) / 10 : 0;

    console.log(`[OVERALL ATTENDANCE] Total Sessions: ${allSessionDocs.length}, Total Records: ${totalRecords}, Present: ${totalPresent}, Absent: ${totalAbsent}, Half-Day: ${totalHalfDay}, Overall Rate: ${overallAttendanceRate}%`);

    res.json({
      success: true,
      totalSessions: allSessionDocs.length,
      totalPresent,
      totalAbsent,
      totalHalfDay,
      totalRecords,
      overallAttendanceRate,
      attendanceRateFormatted: `${overallAttendanceRate}%`
    });

  } catch (error) {
    console.error('Error fetching overall attendance rate:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching overall attendance rate', 
      error: error.message 
    });
  }
};

// Lock attendance (prevent further modifications)
exports.lockAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    // Check if user is admin or teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    // Check if user has access to this attendance's school
    if (req.user.schoolId?.toString() !== attendance.schoolId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    attendance.isLocked = true;
    attendance.lockedBy = req.user._id;
    attendance.lockedAt = new Date();
    attendance.updatedBy = req.user._id;
    attendance.updatedAt = new Date();

    await attendance.save();

    res.json({ 
      message: 'Attendance locked successfully',
      attendance: {
        id: attendance._id,
        isLocked: attendance.isLocked,
        lockedAt: attendance.lockedAt
      }
    });

  } catch (error) {
    console.error('Error locking attendance:', error);
    res.status(500).json({ message: 'Error locking attendance', error: error.message });
  }
};

// Get student attendance report
// Get student's own attendance (for student role)
exports.getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate, limit = 30 } = req.query;

    // Only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({ 
        success: false,
        message: 'This endpoint is only for students' 
      });
    }

    // Get student's userId from authenticated user
    const studentUserId = req.user.userId || req.user._id;
    const schoolCode = req.user.schoolCode;
    
    console.log(`[GET MY ATTENDANCE] Student: ${studentUserId}, School: ${schoolCode}`);

    if (!schoolCode) {
      return res.status(400).json({ 
        success: false,
        message: 'School code not found' 
      });
    }

    // Get student's class and section
    const studentClass = req.user.studentDetails?.currentClass || 
                        req.user.studentDetails?.academic?.currentClass || 
                        req.user.class;
    const studentSection = req.user.studentDetails?.currentSection || 
                          req.user.studentDetails?.academic?.currentSection || 
                          req.user.section;

    console.log(`[GET MY ATTENDANCE] Class: ${studentClass}, Section: ${studentSection}`);

    if (!studentClass || !studentSection) {
      return res.status(400).json({ 
        success: false,
        message: 'Student class/section information not found' 
      });
    }

    // Build query to find attendance records
    const query = {
      studentId: studentUserId,
      class: studentClass,
      section: studentSection
    };

    // Add date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.date = { $gte: thirtyDaysAgo };
    }

    console.log(`[GET MY ATTENDANCE] Query:`, JSON.stringify(query));

    // Try school-specific database first
    let attendanceRecords = [];
    try {
      const DatabaseManager = require('../utils/databaseManager');
      const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
      const attendanceCollection = schoolConn.collection('attendances');
      
      attendanceRecords = await attendanceCollection
        .find(query)
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .toArray();
      
      console.log(`[GET MY ATTENDANCE] Found ${attendanceRecords.length} records in school database`);
    } catch (error) {
      console.error(`[GET MY ATTENDANCE] Error accessing school database:`, error.message);
      
      // Fallback to main database
      const Attendance = require('../models/Attendance');
      attendanceRecords = await Attendance.find(query)
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .lean();
      
      console.log(`[GET MY ATTENDANCE] Found ${attendanceRecords.length} records in main database`);
    }

    // Calculate statistics
    let totalDays = attendanceRecords.length;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let leaveDays = 0;

    // Process records and extract session-wise data
    const processedRecords = attendanceRecords.map(record => {
      // Count status
      switch (record.status) {
        case 'present':
          presentDays++;
          break;
        case 'absent':
          absentDays++;
          break;
        case 'late':
          lateDays++;
          break;
        case 'half_day':
          halfDays++;
          break;
        case 'medical_leave':
        case 'authorized_leave':
          leaveDays++;
          break;
      }

      // Extract session information from periods
      const sessions = {
        morning: null,
        afternoon: null
      };

      if (record.timeTracking?.periods && record.timeTracking.periods.length > 0) {
        // Assuming periods 1-4 are morning, 5-8 are afternoon
        const morningPeriods = record.timeTracking.periods.filter(p => p.periodNumber <= 4);
        const afternoonPeriods = record.timeTracking.periods.filter(p => p.periodNumber > 4);

        if (morningPeriods.length > 0) {
          const presentCount = morningPeriods.filter(p => p.status === 'present').length;
          sessions.morning = {
            status: presentCount === morningPeriods.length ? 'present' : 
                   presentCount > 0 ? 'partial' : 'absent',
            periodsPresent: presentCount,
            totalPeriods: morningPeriods.length
          };
        }

        if (afternoonPeriods.length > 0) {
          const presentCount = afternoonPeriods.filter(p => p.status === 'present').length;
          sessions.afternoon = {
            status: presentCount === afternoonPeriods.length ? 'present' : 
                   presentCount > 0 ? 'partial' : 'absent',
            periodsPresent: presentCount,
            totalPeriods: afternoonPeriods.length
          };
        }
      }

      return {
        _id: record._id,
        date: record.date,
        dayOfWeek: record.dayOfWeek,
        status: record.status,
        sessions: sessions,
        checkIn: record.timeTracking?.checkIn?.time,
        checkOut: record.timeTracking?.checkOut?.time,
        totalPeriodsPresent: record.timeTracking?.totalPeriodsPresent || 0,
        totalPeriodsScheduled: record.timeTracking?.totalPeriodsScheduled || 0,
        attendancePercentage: record.timeTracking?.attendancePercentage || 0,
        teacherNotes: record.teacherNotes || [],
        leaveDetails: record.leaveDetails
      };
    });

    // Calculate attendance percentage
    const attendancePercentage = totalDays > 0 
      ? Math.round(((presentDays + (halfDays * 0.5)) / totalDays) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        student: {
          userId: studentUserId,
          class: studentClass,
          section: studentSection
        },
        summary: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          halfDays,
          leaveDays,
          attendancePercentage
        },
        records: processedRecords
      }
    });

  } catch (error) {
    console.error('[GET MY ATTENDANCE] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching attendance', 
      error: error.message 
    });
  }
};

exports.getStudentAttendanceReport = async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;

    // Check if user has access
    if (!['admin', 'teacher', 'student', 'parent'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolId = req.user.schoolId;
    
    // Determine which student to get report for
    let targetStudentId = studentId;
    
    if (req.user.role === 'student') {
      targetStudentId = req.user._id;
    } else if (req.user.role === 'parent') {
      const student = await User.findOne({
        'parentDetails.parentId': req.user.parentDetails?.parentId
      });
      if (student) {
        targetStudentId = student._id;
      }
    }

    if (!targetStudentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Build query
    const query = {
      schoolId,
      'records.student': targetStudentId
    };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('records.student', 'name email studentDetails')
      .sort({ date: -1 });

    // Calculate summary
    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let excusedDays = 0;

    attendance.forEach(record => {
      const studentRecord = record.records.find(r => r.student._id.toString() === targetStudentId.toString());
      if (studentRecord) {
        totalDays++;
        switch (studentRecord.status) {
          case 'present':
            presentDays++;
            break;
          case 'absent':
            absentDays++;
            break;
          case 'late':
            lateDays++;
            break;
          case 'half-day':
            halfDays++;
            break;
          case 'excused':
            excusedDays++;
            break;
        }
      }
    });

    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    res.json({
      student: attendance[0]?.records.find(r => r.student._id.toString() === targetStudentId.toString())?.student,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        excusedDays,
        attendancePercentage
      },
      details: attendance
    });

  } catch (error) {
    console.error('Error fetching student attendance report:', error);
    res.status(500).json({ message: 'Error fetching student attendance report', error: error.message });
  }
};

// Helper function to send parent notifications
const sendParentNotification = async (attendance, student) => {
  try {
    // Find parent
    const parent = await User.findOne({
      _id: student.studentDetails?.parentId,
      role: 'parent'
    });

    if (!parent) return;

    // Simulate SMS/Email notification (integrate with actual service)
    const message = `Dear Parent, Your child ${attendance.studentName} is ${attendance.status} today at ${new Date().toLocaleTimeString()}. - School`;
    
    console.log(`Notification sent to ${parent.email}: ${message}`);
    
    // Update attendance with notification status
    attendance.parentNotification = {
      sent: true,
      sentAt: new Date(),
      method: 'sms' // or 'email'
    };
    
    await attendance.save();
    
  } catch (error) {
    console.error('Error sending parent notification:', error);
  }
};

// Get attendance analytics and reports
exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const { 
      class: className, 
      section, 
      startDate, 
      endDate, 
      studentId,
      type = 'monthly' 
    } = req.query;

    const schoolCode = req.user.schoolCode;
    const filters = { schoolCode };

    // Add filters based on query params
    if (className) filters.class = className;
    if (section) filters.section = section;
    if (studentId) filters.studentId = studentId;
    if (startDate && endDate) {
      filters.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let analytics;

    switch (type) {
      case 'daily':
        analytics = await getDailyAnalytics(filters);
        break;
      case 'weekly':
        analytics = await getWeeklyAnalytics(filters);
        break;
      case 'monthly':
        analytics = await getMonthlyAnalytics(filters);
        break;
      case 'student':
        analytics = await getStudentAnalytics(filters);
        break;
      default:
        return res.status(400).json({ message: 'Invalid analytics type' });
    }

    res.json({
      success: true,
      type,
      filters,
      analytics
    });

  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Daily attendance analytics
const getDailyAnalytics = async (filters) => {
  return await Attendance.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          class: '$class',
          section: '$section'
        },
        totalStudents: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateCount: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        date: '$_id.date',
        class: '$_id.class',
        section: '$_id.section',
        totalStudents: 1,
        presentCount: 1,
        absentCount: 1,
        lateCount: 1,
        attendancePercentage: {
          $multiply: [
            { $divide: ['$presentCount', '$totalStudents'] },
            100
          ]
        }
      }
    },
    { $sort: { date: -1 } }
  ]);
};

// Weekly attendance analytics
const getWeeklyAnalytics = async (filters) => {
  return await Attendance.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          week: { $week: '$date' },
          year: { $year: '$date' },
          class: '$class',
          section: '$section'
        },
        totalStudents: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        averageAttendance: { $avg: '$timeTracking.attendancePercentage' }
      }
    },
    {
      $project: {
        week: '$_id.week',
        year: '$_id.year',
        class: '$_id.class',
        section: '$_id.section',
        totalStudents: 1,
        presentCount: 1,
        absentCount: 1,
        averageAttendance: { $round: ['$averageAttendance', 2] },
        attendancePercentage: {
          $multiply: [
            { $divide: ['$presentCount', '$totalStudents'] },
            100
          ]
        }
      }
    },
    { $sort: { year: -1, week: -1 } }
  ]);
};

// Monthly attendance analytics
const getMonthlyAnalytics = async (filters) => {
  return await Attendance.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          month: '$monthYear',
          class: '$class',
          section: '$section'
        },
        totalRecords: { $sum: 1 },
        totalPresent: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        totalAbsent: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        totalLate: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        uniqueStudents: { $addToSet: '$studentId' }
      }
    },
    {
      $project: {
        month: '$_id.month',
        class: '$_id.class',
        section: '$_id.section',
        totalRecords: 1,
        totalPresent: 1,
        totalAbsent: 1,
        totalLate: 1,
        uniqueStudents: { $size: '$uniqueStudents' },
        attendancePercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$totalPresent', '$totalRecords'] },
                100
              ]
            },
            2
          ]
        }
      }
    },
    { $sort: { month: -1 } }
  ]);
};

// Student-specific analytics
const getStudentAnalytics = async (filters) => {
  return await Attendance.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          studentId: '$studentId',
          studentName: '$studentName'
        },
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateDays: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        averagePeriodsPresent: { $avg: '$timeTracking.totalPeriodsPresent' }
      }
    },
    {
      $project: {
        studentId: '$_id.studentId',
        studentName: '$_id.studentName',
        totalDays: 1,
        presentDays: 1,
        absentDays: 1,
        lateDays: 1,
        averagePeriodsPresent: { $round: ['$averagePeriodsPresent', 1] },
        attendancePercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$presentDays', '$totalDays'] },
                100
              ]
            },
            2
          ]
        }
      }
    },
    { $sort: { attendancePercentage: -1 } }
  ]);
};

// Get attendance for a specific class and section
exports.getClassAttendance = async (req, res) => {
  try {
    const { class: className, section, date, session } = req.query;
    const schoolCode = req.user.schoolCode;

    const query = {
      schoolCode,
      class: className,
      section,
      date: new Date(date)
    };

    // Add session filter if provided
    if (session) {
      query['sessionInfo.session'] = session;
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('studentId', 'name userId studentDetails')
      .sort({ studentName: 1 });

    const formattedRecords = attendanceRecords.map(record => ({
      attendanceId: record.attendanceId,
      studentId: record.studentId._id,
      studentName: record.studentName,
      userId: record.studentId.userId,
      rollNumber: record.studentRollNumber,
      status: record.status,
      session: record.sessionInfo?.session,
      markedAt: record.sessionInfo?.markedAt || record.createdAt,
      markedBy: record.sessionInfo?.markerName || 'System',
      timeTracking: record.timeTracking
    }));

    res.json({
      success: true,
      data: {
        class: className,
        section,
        date,
        session,
        totalRecords: formattedRecords.length,
        records: formattedRecords
      }
    });

  } catch (error) {
    console.error('Error fetching class attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching attendance',
      error: error.message 
    });
  }
};
