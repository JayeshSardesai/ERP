const { ObjectId } = require('mongodb');

class ReportCalculations {
  static async getTotalStudents(db, { targetClass, targetSection }) {
    try {
      const studentQuery = { 
        isActive: true,
        role: 'student' 
      };
      
      if (targetClass && targetClass !== 'ALL') {
        studentQuery['studentDetails.academic.currentClass'] = targetClass;
        if (targetSection && targetSection !== 'ALL') {
          studentQuery['studentDetails.academic.currentSection'] = targetSection;
        }
      }
      
      return await db.collection('students').countDocuments(studentQuery);
    } catch (error) {
      console.error('❌ Error in getTotalStudents:', error);
      return 0;
    }
  }

  static async getAverageAttendance(db, { targetClass, targetSection, from, to }) {
    try {
      const matchStage = {
        date: { $gte: new Date(from), $lte: new Date(to) },
        status: { $exists: true }
      };
      
      if (targetClass && targetClass !== 'ALL') {
        matchStage.class = targetClass;
        if (targetSection && targetSection !== 'ALL') {
          matchStage.section = targetSection;
        }
      }

      const attendanceStats = await db.collection('attendances').aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              studentId: "$studentId",
              date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
            },
            status: { $first: "$status" }
          }
        },
        {
          $group: {
            _id: "$_id.studentId",
            presentDays: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["present", "late", "half_day"]] },
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
            attendancePercentage: {
              $cond: [
                { $eq: ["$totalDays", 0] },
                0,
                { $multiply: [{ $divide: ["$presentDays", "$totalDays"] }, 100] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgAttendance: { $avg: "$attendancePercentage" }
          }
        }
      ]).toArray();

      return attendanceStats[0]?.avgAttendance || 0;
    } catch (error) {
      console.error('❌ Error in getAverageAttendance:', error);
      return 0;
    }
  }

  static async getAverageMarks(db, { targetClass, targetSection }) {
    try {
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      
      const matchStage = { 
        academicYear,
        percentage: { $exists: true, $ne: null }
      };
      
      if (targetClass && targetClass !== 'ALL') {
        matchStage.class = targetClass;
        if (targetSection && targetSection !== 'ALL') {
          matchStage.section = targetSection;
        }
      }

      const marksResult = await db.collection('results').aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$student",
            avgPercentage: { $avg: "$percentage" }
          }
        },
        {
          $group: {
            _id: null,
            classAverage: { $avg: "$avgPercentage" }
          }
        }
      ]).toArray();

      return marksResult[0]?.classAverage || 0;
    } catch (error) {
      console.error('❌ Error in getAverageMarks:', error);
      return 0;
    }
  }
}

module.exports = ReportCalculations;