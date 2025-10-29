const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
const ReportCalculations = require('./reportCalculations');
const { ObjectId } = require('mongodb');
const Result = require('../models/Result');

class ReportService {
  async getSchoolSummary(schoolId, schoolCode, filters = {}) {
    try {
      console.log('🔍 [getSchoolSummary] Starting summary for school:', schoolCode, 'with filters:', JSON.stringify(filters, null, 2));
      
      const { targetClass, targetSection, from, to } = filters;
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      
      // Set default date range to current month if not provided
      const startDate = from || new Date(currentYear, currentDate.getMonth(), 1);
      const endDate = to || new Date(currentYear, currentDate.getMonth() + 1, 0);
      
      // Convert schoolId to ObjectId
      const schoolObjectId = new ObjectId(schoolId);
      
      // Get database connection
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;
      
      // Build match query for results
      const matchQuery = {
        schoolId: schoolObjectId,
        academicYear,
        status: 'published', // Only consider published results
        'date': { $gte: startDate, $lte: endDate } // Filter by date range
      };
      
      // Add class filter if provided
      if (targetClass && targetClass !== 'ALL') {
        matchQuery.class = targetClass.toString();
      }
      
      // Add section filter if provided
      if (targetSection && targetSection !== 'ALL') {
        matchQuery.section = targetSection.toString();
      }
      
      console.log('🔍 [getSchoolSummary] Final match query:', JSON.stringify(matchQuery, null, 2));
      
      // Debug: First, check if we have any documents at all
      const totalDocs = await Result.countDocuments({});
      console.log(`📊 [getSchoolSummary] Total documents in results collection: ${totalDocs}`);
      
      if (totalDocs === 0) {
        console.log('⚠️ [getSchoolSummary] The results collection is empty');
        return {
          totalStudents: 0,
          totalMarks: 0,
          totalResults: 0,
          avgMarks: 0,
          avgAttendance: 0,
          classResults: [],
          attendanceData: []
        };
      }
      
      // Debug: Get sample documents to see what fields exist
      const sampleDocs = await Result.aggregate([
        { $sample: { size: 3 } },
        { 
          $project: { 
            status: 1, 
            class: 1, 
            section: 1, 
            academicYear: 1, 
            student: 1,
            percentage: 1,
            createdAt: 1,
            updatedAt: 1
          } 
        }
      ]);
      
      console.log('� [getSchoolSummary] Sample documents from collection:', JSON.stringify(sampleDocs, null, 2));
      
      // Try to find any document with a status field
      const anyDoc = await Result.findOne({});
      console.log('🔍 [getSchoolSummary] Any document from collection:', JSON.stringify(anyDoc, null, 2));
      
      // Check with a more lenient query
      const resultCount = await Result.countDocuments({
        ...matchQuery,
        $or: [
          { status: { $exists: false } },  // Documents without status field
          { status: 'published' },          // OR with status published
          { status: { $in: [null, ''] } }   // OR with empty/undefined status
        ]
      });
      
      console.log(`� [getSchoolSummary] Found ${resultCount} results with lenient criteria`);

      // Get class-wise results using Mongoose aggregate
      const [classResults, attendanceData] = await Promise.all([
        // Get academic results
        Result.aggregate([
          { 
            $match: { 
              ...matchQuery,
              status: 'published',
              percentage: { $exists: true, $gt: 0 },
              $or: [
                { publishedAt: { $exists: false } },
                { publishedAt: { $lte: new Date() } }
              ]
            } 
          },
          {
            $group: {
              _id: {
                class: '$class',
                section: '$section'
              },
              totalStudents: { $addToSet: '$student' },
              avgPercentage: { $avg: '$percentage' },
              totalResults: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              class: '$_id.class',
              section: '$_id.section',
              totalStudents: { $size: '$totalStudents' },
              avgMarks: { $round: ['$avgPercentage', 2] },
              totalResults: 1
            }
          },
          { $sort: { class: 1, section: 1 } }
        ]).allowDiskUse(true),
        
        // Get attendance data
        db.collection('attendances').aggregate([
          {
            $match: {
              schoolId: schoolObjectId,
              date: { $gte: startDate, $lte: endDate },
              status: { $in: ['present', 'absent', 'half_day'] }
            }
          },
          {
            $group: {
              _id: {
                class: '$class',
                section: '$section'
              },
              presentDays: {
                $sum: {
                  $cond: [
                    { $in: ['$status', ['present', 'half_day']] },
                    1,
                    0
                  ]
                }
              },
              totalDays: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              class: '$_id.class',
              section: '$_id.section',
              attendancePercentage: {
                $cond: [
                  { $eq: ['$totalDays', 0] },
                  0,
                  { $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] }
                ]
              }
            }
          }
        ]).toArray()
      ]);

      // Debug: Log raw data before calculations
      console.log('📊 [getSchoolSummary] Raw classResults:', JSON.stringify(classResults, null, 2));
      console.log('📊 [getSchoolSummary] Raw attendanceData:', JSON.stringify(attendanceData, null, 2));
      
      // Calculate overall summary
      const totalStudents = classResults.reduce((sum, item) => sum + (item.totalStudents || 0), 0);
      const totalMarks = classResults.reduce((sum, item) => sum + (item.avgMarks * item.totalResults), 0);
      const totalResults = classResults.reduce((sum, item) => sum + (item.totalResults || 0), 0);
      const avgMarks = totalResults > 0 ? totalMarks / totalResults : 0;
      
      // Calculate average attendance
      const totalAttendance = attendanceData.reduce((sum, item) => sum + (item.attendancePercentage || 0), 0);
      const avgAttendance = attendanceData.length > 0 ? totalAttendance / attendanceData.length : 0;
      
      // Debug: Log calculated values
      console.log('📊 [getSchoolSummary] Calculated values:', {
        totalStudents,
        totalMarks,
        totalResults,
        avgMarks: Math.round(avgMarks * 10) / 10,
        avgAttendance: Math.round(avgAttendance * 10) / 10,
        classResultsCount: classResults.length,
        attendanceDataCount: attendanceData.length
      });

      return {
        classWiseResults: classResults,
        summary: {
          totalClasses: new Set(classResults.map(r => r.class)).size,
          totalStudents,
          avgMarks: Math.round(avgMarks * 10) / 10,
          avgAttendance: Math.round(avgAttendance * 10) / 10
        }
      };
      
    } catch (error) {
      console.error('❌ [getSchoolSummary] Error:', {
        message: error.message,
        stack: error.stack,
        schoolId,
        filters
      });
      
      // Return a more detailed error response
      const errorResponse = {
        success: false,
        error: 'Failed to generate school summary',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        classWiseResults: [],
        summary: {
          totalClasses: 0,
          totalStudents: 0,
          avgMarks: 0
        }
      };
      
      return errorResponse;
    }
  }

  // Add the exportToCSV method
  async exportToCSV(schoolId, schoolCode, exportType, filters = {}) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;

      const { class: targetClass, section: targetSection, from, to } = filters;
      let data = [];
      let headers = [];

      switch (exportType) {
        case 'dues':
          const duesQuery = { 
            schoolId: new ObjectId(schoolId),
            totalPending: { $gt: 0 }
          };
          
          if (targetClass && targetClass !== 'ALL') duesQuery.studentClass = targetClass;
          if (targetSection && targetSection !== 'ALL') duesQuery.studentSection = targetSection;
          if (filters.status && filters.status !== 'ALL') {
            duesQuery.status = filters.status.toUpperCase();
          }
          if (filters.search) {
            const searchRegex = new RegExp(filters.search, 'i');
            duesQuery.$or = [
              { studentName: searchRegex },
              { rollNumber: searchRegex }
            ];
          }

          const dues = await db.collection('studentfeerecords').aggregate([
            { $match: duesQuery },
            { $unwind: '$installments' },
            {
              $project: {
                _id: 0,
                'Student Name': '$studentName',
                'Class': '$studentClass',
                'Section': '$studentSection',
                'Fee Structure': '$feeStructureName',
                'Installment': '$installments.name',
                'Amount': '$installments.amount',
                'Paid Amount': '$installments.paidAmount',
                'Balance': { $subtract: ['$installments.amount', '$installments.paidAmount'] },
                'Status': {
                  $let: {
                    vars: {
                      isPaid: { $eq: ['$installments.status', 'PAID'] },
                      hasPartial: { $gt: ['$installments.paidAmount', 0] },
                      isOverdue: { $lt: ['$installments.dueDate', new Date()] }
                    },
                    in: {
                      $switch: {
                        branches: [
                          { case: '$$isPaid', then: 'Paid' },
                          { case: '$$hasPartial', then: 'Partial' },
                          { case: '$$isOverdue', then: 'Overdue' }
                        ],
                        default: 'Pending'
                      }
                    }
                  }
                }
              }
            },
            { $sort: { 'Class': 1, 'Section': 1, 'Student Name': 1 } }
          ]).toArray();

          if (dues.length > 0) {
            headers = Object.keys(dues[0]);
            data = dues.map(record => Object.values(record));
          } else {
            headers = ['Message'];
            data = [['No dues records found matching the criteria']];
          }
          break;

        // Add other export types (students, attendance, results) as needed
        default:
          headers = ['Message'];
          data = [['Export type not supported']];
      }

      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
}

module.exports = new ReportService();