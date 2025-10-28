const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');

class ReportService {
  // Get comprehensive school summary with KPIs
  async getSchoolSummary(schoolId, schoolCode, filters = {}) {
    try {
      console.log('🔍 [getSchoolSummary] Filters received:', JSON.stringify(filters, null, 2));
      
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;
      const studentsCollection = db.collection('students');

      const { from, to, targetClass, targetSection } = filters;
      
      // Log the database being queried
      console.log('📂 Using database:', db.databaseName);

      // First, get the class document to find its students
      let classStudents = [];
      let totalStudents = 0;
      
      if (targetClass && targetClass !== 'ALL') {
        try {
          // Find the class document
          const classQuery = { className: targetClass };
          if (targetSection && targetSection !== 'ALL') {
            classQuery['sections.name'] = targetSection;
          }
          
          console.log('🔍 Looking for class with query:', JSON.stringify(classQuery, null, 2));
          
          const classDoc = await db.collection('classes').findOne(classQuery);
          
          if (classDoc) {
            console.log('🏫 Found class document:', {
              _id: classDoc._id,
              className: classDoc.className,
              sections: classDoc.sections,
              hasStudents: !!classDoc.students,
              studentsCount: classDoc.students ? classDoc.students.length : 0
            });
            
            if (classDoc.students) {
              classStudents = classDoc.students.filter(s => s.isActive !== false);
              totalStudents = classStudents.length;
              console.log(`📊 Found ${totalStudents} active students in class ${targetClass}${targetSection ? ' ' + targetSection : ''}`);
              
              // If no students in class document, try to find them in students collection
              if (totalStudents === 0) {
                console.log('🔍 No students in class document, checking students collection...');
                const studentsInClass = await db.collection('students').find({
                  'studentDetails.academic.currentClass': targetClass,
                  'studentDetails.academic.currentSection': targetSection || { $exists: true },
                  isActive: true
                }).toArray();
                
                console.log(`🔍 Found ${studentsInClass.length} students in students collection`);
                if (studentsInClass.length > 0) {
                  // Update the class document with these students
                  const studentUpdates = studentsInClass.map(student => ({
                    studentId: student._id,
                    studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'Unknown',
                    rollNumber: student.rollNumber || `STU-${student._id.toString().substring(0, 6)}`,
                    isActive: true
                  }));
                  
                  await db.collection('classes').updateOne(
                    { _id: classDoc._id },
                    { $set: { students: studentUpdates, updatedAt: new Date() } }
                  );
                  
                  totalStudents = studentUpdates.length;
                  console.log(`✅ Updated class document with ${totalStudents} students`);
                }
              }
            } else {
              console.log('⚠️ Class document has no students array');
            }
          } else {
            console.log(`⚠️ No class found matching: ${targetClass}${targetSection ? ' ' + targetSection : ''}`);
          }
        } catch (error) {
          console.error('❌ Error finding class or students:', error);
          throw error;
        }
      } else {
        // If no specific class is selected, count all active students
        totalStudents = await db.collection('students').countDocuments({ 
          role: 'student',
          isActive: true,
          _placeholder: { $ne: true }
        });
      }

      // Log the student count
      console.log(`📊 Total active students: ${totalStudents}`);

      // Get dues information
      console.log('💰 Fetching dues information...');
      const duesCollection = db.collection('studentfeerecords');
      
      // First, log the structure of the first few records
      const sampleRecords = await duesCollection.find({}).limit(3).toArray();
      console.log('🔍 Sample student fee records:', JSON.stringify(sampleRecords, null, 2));
      
      // Log all unique class and section combinations
      const allClassSections = await duesCollection.aggregate([
        { $group: {
            _id: {
              class: '$studentClass',
              section: '$studentSection'
            },
            count: { $sum: 1 }
        }}
      ]).toArray();
      console.log('📋 All class-section combinations in studentfeerecords:', JSON.stringify(allClassSections, null, 2));
      
      // Import ObjectId
      const { ObjectId } = require('mongodb');
      
      // Build the initial query with schoolId as ObjectId
      const duesQuery = { 
        schoolId: typeof schoolId === 'string' ? new ObjectId(schoolId) : schoolId 
      };
      
      // Log the incoming filters
      console.log('🔍 Received filters:', { 
        targetClass: { value: targetClass, type: typeof targetClass },
        targetSection: { value: targetSection, type: typeof targetSection }
      });
      
      // Add class filter if specified
      if (targetClass && targetClass !== 'ALL') {
        console.log(`🔍 Looking for class matching: '${targetClass}'`);
        
        // First, try to find the exact class name as stored in the database
        const allClasses = await duesCollection.distinct('studentClass', { schoolId });
        console.log('📋 All available classes in database:', allClasses);
        
        // Normalize the target class name for comparison (handle spaces, case, etc.)
        const normalize = (str) => String(str || '').trim().replace(/\s+/g, ' ').toLowerCase();
        const targetClassNormalized = normalize(targetClass);
        
        console.log(`🔍 Normalized target class: '${targetClassNormalized}'`);
        
        // Find the first class that matches when normalized
        const exactClass = allClasses.find(c => {
          const classNormalized = normalize(c);
          console.log(`🔍 Comparing: '${classNormalized}' with '${targetClassNormalized}'`);
          return classNormalized === targetClassNormalized;
        });
        
        if (exactClass) {
          console.log(`✅ Found matching class: '${exactClass}'`);
          // Use the exact case from the database
          duesQuery.studentClass = exactClass;
          
          // Add section filter if specified
          if (targetSection && targetSection !== 'ALL') {
            console.log(`🔍 Looking for section matching: '${targetSection}' in class '${exactClass}'`);
            
            // Find sections for the selected class using the exact class name
            const sectionsForClass = await duesCollection.distinct('studentSection', { 
              schoolId, 
              studentClass: exactClass 
            });
            
            console.log(`📋 Available sections for class '${exactClass}':`, sectionsForClass);
            
            // Normalize section names for comparison
            const targetSectionNormalized = normalize(targetSection);
            const exactSection = sectionsForClass.find(s => 
              normalize(s) === targetSectionNormalized
            );
            
            if (exactSection) {
              console.log(`✅ Found matching section: '${exactSection}'`);
              // Use the exact case from the database
              duesQuery.studentSection = exactSection;
            } else {
              console.log(`⚠️ No section found matching: '${targetSection}'. Available sections:`, sectionsForClass);
              // Don't add section filter if no match found
            }
          }
        } else {
          console.log(`⚠️ No class found matching: '${targetClass}'. Available classes:`, allClasses);
          // Don't add class filter if no match found
          delete duesQuery.studentClass;
        }
      }
      
      // Log the final query with proper ObjectId handling
      console.log('🔍 Final MongoDB query:', JSON.stringify({
        ...duesQuery,
        schoolId: 'ObjectId("' + duesQuery.schoolId.toString() + '")'
      }, null, 2));
      
      // Get a sample document that matches the query
      const sampleDoc = await duesCollection.findOne(duesQuery);
      console.log('🔍 Sample matching document:', sampleDoc ? {
        ...sampleDoc,
        _id: sampleDoc._id.toString(),
        schoolId: sampleDoc.schoolId.toString()
      } : 'No matching document found');
      
      // Get all documents that match the query for debugging
      const matchingDocs = await duesCollection.find(duesQuery).toArray();
      console.log(`📊 Found ${matchingDocs.length} matching documents`);
      
      if (matchingDocs.length > 0) {
        console.log('📝 First matching document class/section:', {
          studentClass: matchingDocs[0].studentClass,
          studentSection: matchingDocs[0].studentSection,
          totalAmount: matchingDocs[0].totalAmount,
          totalPaid: matchingDocs[0].totalPaid,
          totalPending: matchingDocs[0].totalPending
        });
      }
      
      // Log a sample of the data that should match this query
      const sampleMatch = await duesCollection.findOne(duesQuery);
      console.log('🔍 Sample matching document:', sampleMatch);

      // Get total dues summary
      const duesSummary = await duesCollection.aggregate([
        { $match: duesQuery },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$totalPaid' },
            totalPending: { $sum: '$totalPending' },
            count: { $sum: 1 },
            overdueCount: {
              $sum: {
                $cond: [{ $gt: ['$overdueDays', 0] }, 1, 0]
              }
            }
          }
        }
      ]).toArray();

      // Get all students with dues, sorted by highest pending amount
      const topDuesStudents = await duesCollection.aggregate([
        { $match: { ...duesQuery, totalPending: { $gt: 0 } } },
        { $sort: { totalPending: -1 } },
        {
          $project: {
            _id: 0,
            studentName: 1,
            studentClass: 1,
            studentSection: 1,
            totalPending: 1,
            overdueDays: 1,
            paymentPercentage: {
              $cond: [
                { $gt: ['$totalAmount', 0] },
                { $multiply: [{ $divide: ['$totalPaid', '$totalAmount'] }, 100] },
                0
              ]
            }
          }
        }
      ]).toArray();

      // Get class-wise dues distribution with the same filtering as duesQuery
      console.log('📊 Getting class-wise dues with query:', JSON.stringify(duesQuery, null, 2));
      
      // First, get all matching documents to verify
      const allMatchingDues = await duesCollection.find(duesQuery).toArray();
      console.log(`📋 Found ${allMatchingDues.length} matching fee records`);
      
      if (allMatchingDues.length > 0) {
        console.log('📝 Sample matching record:', {
          studentClass: allMatchingDues[0].studentClass,
          studentSection: allMatchingDues[0].studentSection,
          totalAmount: allMatchingDues[0].totalAmount,
          totalPaid: allMatchingDues[0].totalPaid,
          totalPending: allMatchingDues[0].totalPending
        });
      }

      const classWiseDues = await duesCollection.aggregate([
        { $match: duesQuery },  // Use the same query as before
        {
          $group: {
            _id: {
              class: '$studentClass',
              section: '$studentSection'
            },
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$totalPaid' },
            totalPending: { $sum: '$totalPending' },
            studentCount: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            class: '$_id.class',
            section: '$_id.section',
            totalAmount: 1,
            totalPending: 1,
            studentCount: 1,
            collectionRate: {
              $cond: [
                { $eq: ['$totalAmount', 0] },
                0,
                {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ['$totalAmount', '$totalPending'] },
                        '$totalAmount'
                      ]
                    },
                    100
                  ]
                }
              ]
            }
          }
        },
        { $sort: { class: 1, section: 1 } }
      ]).toArray();

      console.log('📊 Class-wise dues distribution:', JSON.stringify(classWiseDues, null, 2));
      
      // Log the aggregation pipeline for debugging
      console.log('🔍 Aggregation pipeline used:', [
        { $match: duesQuery },
        {
          $group: {
            _id: {
              class: '$studentClass',
              section: '$studentSection'
            },
            totalAmount: { $sum: '$totalAmount' },
            totalPending: { $sum: '$totalPending' },
            studentCount: { $sum: 1 }
          }
        }
      ]);

      // Get classes count
      const classesCollection = db.collection('classes');
      const classesQuery = { isActive: true };
      if (targetClass && targetClass !== 'ALL') {
        classesQuery.className = targetClass;
      }
      const classesCount = await classesCollection.countDocuments(classesQuery);

      // Calculate average attendance
      const attendanceCollection = db.collection('attendance');
      
      // Build attendance query
      const attendanceQuery = { studentId: { $exists: true } };
      
      // Add date filters if provided
      if (from) attendanceQuery.date = { $gte: new Date(from) };
      if (to) attendanceQuery.date = { ...attendanceQuery.date, $lte: new Date(to) };
      
      // Define student query
      const studentQuery = {
        role: 'student',
        isActive: true,
        _placeholder: { $ne: true }
      };
      
      // Add class filter if specified
      if (targetClass && targetClass !== 'ALL') {
        studentQuery['studentDetails.academic.currentClass'] = targetClass;
        if (targetSection && targetSection !== 'ALL') {
          studentQuery['studentDetails.academic.currentSection'] = targetSection;
        }
      }
      
      // Get student IDs for the selected class/section
      const studentIds = await studentsCollection.find(studentQuery, { _id: 1 }).toArray();
      const studentIdList = studentIds.map(s => s._id.toString());
      
      if (studentIdList.length > 0) {
        attendanceQuery.studentId = { $in: studentIdList };
      } else {
        // If no students match the class/section, set attendance to 0
        return {
          totalStudents: 0,
          classesCount: 0,
          avgAttendance: 0,
          totalFeesCollected: 0,
          outstanding: 0,
          collectionPercentage: 0
        };
      }

      const attendanceStats = await attendanceCollection.aggregate([
        { $match: attendanceQuery },
        {
          $group: {
            _id: '$studentId',
            totalDays: { $sum: 1 },
            presentDays: {
              $sum: {
                $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            avgAttendance: {
              $avg: {
                $cond: [
                  { $gt: ['$totalDays', 0] },
                  { $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] },
                  0
                ]
              }
            }
          }
        }
      ]).toArray();

      let avgAttendance = 0;
      
      if (attendanceStats && attendanceStats.length > 0 && attendanceStats[0].avgAttendance) {
        // Round to 2 decimal places
        avgAttendance = Math.round(attendanceStats[0].avgAttendance * 100) / 100;
      }
      
      console.log('📊 Attendance stats:', {
        studentCount: studentIdList.length,
        attendanceStats,
        avgAttendance
      });

      // Get fee statistics
      const FeeStructure = require('../models/FeeStructure');
      const StudentFeeRecordSchema = require('../models/StudentFeeRecord').schema;
      
      // Get or create StudentFeeRecord model for the school database
      let StudentFeeRecord;
      try {
        StudentFeeRecord = connection.model('StudentFeeRecord');
      } catch (error) {
        // If model doesn't exist, create it
        StudentFeeRecord = connection.model('StudentFeeRecord', StudentFeeRecordSchema);
      }
      
      const feeQuery = { schoolId };
      if (targetClass && targetClass !== 'ALL') {
        feeQuery.class = targetClass;
      }
      if (targetSection && targetSection !== 'ALL') {
        feeQuery.section = targetSection;
      }
      
      const feeStats = await StudentFeeRecord.aggregate([
        { $match: feeQuery },
        {
          $group: {
            _id: null,
            totalFeesAssigned: { $sum: '$totalAmount' },
            totalFeesCollected: { $sum: '$totalPaid' },
            outstanding: { $sum: '$totalPending' }
          }
        }
      ]);

      const feeResult = feeStats[0] || {
        totalFeesAssigned: 0,
        totalFeesCollected: 0,
        outstanding: 0
      };

      // Get average marks (if results exist)
      const resultsCollection = db.collection('results');
      const resultsQuery = {};
      if (from) resultsQuery.createdAt = { $gte: new Date(from) };
      if (to) resultsQuery.createdAt = { ...resultsQuery.createdAt, $lte: new Date(to) };

      const marksStats = await resultsCollection.aggregate([
        { $match: resultsQuery },
        {
          $group: {
            _id: null,
            avgMarks: { $avg: '$percentage' },
            totalResults: { $sum: 1 }
          }
        }
      ]).toArray();

      const avgMarks = marksStats[0]?.avgMarks || 0;

      // Prepare dues summary
      const duesSummaryData = duesSummary[0] || {
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        count: 0,
        overdueCount: 0
      };

      return {
        // Existing metrics
        totalStudents,
        classesCount,
        avgAttendance: Math.round(avgAttendance * 100) / 100,
        totalFeesAssigned: feeResult.totalFeesAssigned,
        totalFeesCollected: feeResult.totalFeesCollected,
        outstanding: feeResult.outstanding,
        collectionPercentage: feeResult.totalFeesAssigned > 0 
          ? Math.round((feeResult.totalFeesCollected / feeResult.totalFeesAssigned) * 100)
          : 0,
        avgMarks: Math.round(avgMarks * 100) / 100,
        
        // New dues information
        duesSummary: {
          totalAmount: duesSummaryData.totalAmount || 0,
          totalPaid: duesSummaryData.totalPaid || 0,
          totalPending: duesSummaryData.totalPending || 0,
          totalStudents: duesSummaryData.count || 0,
          overdueStudents: duesSummaryData.overdueCount || 0,
          collectionRate: duesSummaryData.totalAmount > 0 
            ? Math.round(((duesSummaryData.totalPaid || 0) / duesSummaryData.totalAmount) * 100)
            : 0
        },
        topDuesStudents: topDuesStudents || [],
        classWiseDues: classWiseDues || []
      };
    } catch (error) {
      console.error('Error generating school summary:', error);
      throw error;
    }
  }

  // Get class-wise summary
  async getClassSummary(schoolId, schoolCode, filters = {}) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;

      const { from, to } = filters;

      // Get all classes
      const classesCollection = db.collection('classes');
      const classes = await classesCollection.find({ isActive: true }).toArray();

      const classSummaries = [];

      for (const cls of classes) {
        const studentQuery = { 
          role: 'student',
          class: cls.className,
          _placeholder: { $ne: true }
        };

        // Student count
        const studentsCollection = db.collection('students');
        const studentCount = await studentsCollection.countDocuments(studentQuery);

        // Average attendance for this class
        const attendanceCollection = db.collection('attendance');
        const attendanceQuery = { 
          studentId: { $exists: true },
          class: cls.className
        };
        if (from) attendanceQuery.date = { $gte: new Date(from) };
        if (to) attendanceQuery.date = { ...attendanceQuery.date, $lte: new Date(to) };

        const classAttendanceStats = await attendanceCollection.aggregate([
          { $match: attendanceQuery },
          {
            $group: {
              _id: '$studentId',
              totalDays: { $sum: 1 },
              presentDays: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              avgAttendance: {
                $avg: {
                  $cond: [
                    { $gt: ['$totalDays', 0] },
                    { $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] },
                    0
                  ]
                }
              }
            }
          }
        ]).toArray();

        const avgAttendance = classAttendanceStats[0]?.avgAttendance || 0;

        // Average marks for this class
        const resultsCollection = db.collection('results');
        const resultsQuery = { class: cls.className };
        if (from) resultsQuery.createdAt = { $gte: new Date(from) };
        if (to) resultsQuery.createdAt = { ...resultsQuery.createdAt, $lte: new Date(to) };

        const classMarksStats = await resultsCollection.aggregate([
          { $match: resultsQuery },
          {
            $group: {
              _id: null,
              avgMarks: { $avg: '$percentage' },
              totalResults: { $sum: 1 }
            }
          }
        ]).toArray();

        const avgMarks = classMarksStats[0]?.avgMarks || 0;

        // Fee statistics for this class
        const StudentFeeRecord = require('../models/StudentFeeRecord');
        const classFeeStats = await StudentFeeRecord.aggregate([
          { $match: { schoolId, studentClass: cls.className } },
          {
            $group: {
              _id: null,
              totalFeesAssigned: { $sum: '$totalAmount' },
              totalFeesCollected: { $sum: '$totalPaid' },
              outstanding: { $sum: '$totalPending' }
            }
          }
        ]).toArray();

        const feeResult = classFeeStats[0] || {
          totalFeesAssigned: 0,
          totalFeesCollected: 0,
          outstanding: 0
        };

        const collectionPercentage = feeResult.totalFeesAssigned > 0 
          ? Math.round((feeResult.totalFeesCollected / feeResult.totalFeesAssigned) * 100)
          : 0;
      }

      return classSummaries;
    } catch (error) {
      console.error('Error generating class summary:', error);
      throw error;
    }
  }

  // Get detailed student data for a class
  async getClassDetail(schoolId, schoolCode, className, section, filters = {}) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;

      const { from, to, page = 1, limit = 50, search } = filters;
      const skip = (page - 1) * limit;

      // Build student query
      const studentQuery = { 
        role: 'student',
        class: className,
        _placeholder: { $ne: true }
      };

      if (section && section !== 'ALL') {
        studentQuery.section = section;
      }

      if (search) {
        studentQuery.$or = [
          { 'name.firstName': { $regex: search, $options: 'i' } },
          { 'name.lastName': { $regex: search, $options: 'i' } },
          { 'name.displayName': { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } }
        ];
      }

      // Get students with pagination
      const studentsCollection = db.collection('students');
      const students = await studentsCollection
        .find(studentQuery)
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalStudents = await studentsCollection.countDocuments(studentQuery);

      // Get additional data for each student
      const studentsWithDetails = await Promise.all(
        students.map(async (student) => {
          // Get attendance percentage
          const attendanceCollection = db.collection('attendance');
          const attendanceQuery = { studentId: student._id };
          if (from) attendanceQuery.date = { $gte: new Date(from) };
          if (to) attendanceQuery.date = { ...attendanceQuery.date, $lte: new Date(to) };

          const attendanceStats = await attendanceCollection.aggregate([
            { $match: attendanceQuery },
            {
              $group: {
                _id: null,
                totalDays: { $sum: 1 },
                presentDays: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
                  }
                }
              }
            }
          ]).toArray();

          const attendancePercentage = attendanceStats[0] 
            ? Math.round((attendanceStats[0].presentDays / attendanceStats[0].totalDays) * 100)
            : 0;

          // Get latest results
          const resultsCollection = db.collection('results');
          const latestResult = await resultsCollection
            .findOne(
              { studentId: student._id },
              { sort: { createdAt: -1 } }
            );

          // Get fee status
          const StudentFeeRecord = require('../models/StudentFeeRecord');
          const feeRecord = await StudentFeeRecord.findOne({
            schoolId,
            studentId: student._id
          });

          // Get unread messages count
          const Message = require('../models/Message');
          const unreadMessagesCount = await Message.countDocuments({
            schoolId,
            sentTo: student._id,
            [`readBy.${student._id}`]: { $exists: false }
          });

          return {
            ...student,
            attendancePercentage,
            latestResult: latestResult ? {
              percentage: latestResult.percentage,
              grade: latestResult.grade,
              term: latestResult.term,
              createdAt: latestResult.createdAt
            } : null,
            feeStatus: feeRecord ? {
              totalAmount: feeRecord.totalAmount,
              totalPaid: feeRecord.totalPaid,
              balance: feeRecord.totalPending,
              status: feeRecord.status
            } : null,
            unreadMessagesCount
          };
        })
      );

      return {
        students: studentsWithDetails,
        pagination: {
          page,
          limit,
          total: totalStudents,
          pages: Math.ceil(totalStudents / limit)
        }
      };
    } catch (error) {
      console.error('Error getting class detail:', error);
      throw error;
    }
  }

  // Get full student profile
  async getStudentProfile(schoolId, schoolCode, studentId) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;

      // Get student basic info
      const studentsCollection = db.collection('students');
      const student = await studentsCollection.findOne({ _id: studentId });

      if (!student) {
        throw new Error('Student not found');
      }

      // Get attendance timeline
      const attendanceCollection = db.collection('attendance');
      const attendanceTimeline = await attendanceCollection
        .find({ studentId })
        .sort({ date: -1 })
        .limit(30)
        .toArray();

      // Get results history
      const resultsCollection = db.collection('results');
      const resultsHistory = await resultsCollection
        .find({ studentId })
        .sort({ createdAt: -1 })
        .toArray();

      // Get payment history
      const StudentFeeRecord = require('../models/StudentFeeRecord');
      const feeRecord = await StudentFeeRecord.findOne({
        schoolId,
        studentId
      });

      // Get messages
      const Message = require('../models/Message');
      const messages = await Message.find({
        schoolId,
        sentTo: studentId
      }).sort({ createdAt: -1 }).limit(20);

      return {
        student,
        attendanceTimeline,
        resultsHistory,
        paymentHistory: feeRecord?.payments || [],
        messages: messages.map(msg => ({
          id: msg._id,
          title: msg.subject,
          content: msg.content,
          sentAt: msg.sentAt,
          readAt: msg.readBy?.get(studentId.toString())
        }))
      };
    } catch (error) {
      console.error('Error getting student profile:', error);
      throw error;
    }
  }

  // Export data to CSV
  async exportToCSV(schoolId, schoolCode, exportType, filters = {}) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;

      const { class: targetClass, section: targetSection, from, to } = filters;

      let data = [];
      let headers = [];

      switch (exportType) {
        case 'students':
          const studentQuery = { 
            role: 'student',
            _placeholder: { $ne: true }
          };
          if (targetClass && targetClass !== 'ALL') studentQuery.class = targetClass;
          if (targetSection && targetSection !== 'ALL') studentQuery.section = targetSection;

          const students = await db.collection('students').find(studentQuery).toArray();
          
          headers = ['Name', 'Class', 'Section', 'Roll Number', 'Email', 'Phone'];
          data = students.map(student => [
            student.name?.displayName || `${student.name?.firstName} ${student.name?.lastName}`,
            student.class,
            student.section,
            student.rollNumber || '',
            student.email || '',
            student.contact?.primaryPhone || ''
          ]);
          break;

        case 'attendance':
          const attendanceQuery = { studentId: { $exists: true } };
          if (from) attendanceQuery.date = { $gte: new Date(from) };
          if (to) attendanceQuery.date = { ...attendanceQuery.date, $lte: new Date(to) };
          if (targetClass && targetClass !== 'ALL') attendanceQuery.class = targetClass;
          if (targetSection && targetSection !== 'ALL') attendanceQuery.section = targetSection;

          const attendanceRecords = await db.collection('attendance').find(attendanceQuery).toArray();
          
          headers = ['Student Name', 'Class', 'Section', 'Date', 'Status'];
          data = await Promise.all(attendanceRecords.map(async (record) => {
            const student = await db.collection('students').findOne({ _id: record.studentId });
            return [
              student?.name?.displayName || 'Unknown',
              record.class,
              record.section,
              record.date,
              record.status
            ];
          }));
          break;

        case 'results':
          const resultsQuery = {};
          if (from) resultsQuery.createdAt = { $gte: new Date(from) };
          if (to) resultsQuery.createdAt = { ...resultsQuery.createdAt, $lte: new Date(to) };
          if (targetClass && targetClass !== 'ALL') resultsQuery.class = targetClass;
          if (targetSection && targetSection !== 'ALL') resultsQuery.section = targetSection;

          const results = await db.collection('results').find(resultsQuery).toArray();
          
          headers = ['Student Name', 'Class', 'Section', 'Term', 'Percentage', 'Grade'];
          data = await Promise.all(results.map(async (result) => {
            const student = await db.collection('students').findOne({ _id: result.studentId });
            return [
              student?.name?.displayName || 'Unknown',
              result.class,
              result.section,
              result.term,
              result.percentage,
              result.grade
            ];
          }));
          break;
      }

      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
}

module.exports = new ReportService();
