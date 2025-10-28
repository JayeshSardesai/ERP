const StudentFeeRecord = require('../models/StudentFeeRecord');
const FeeStructure = require('../models/FeeStructure');
const Message = require('../models/Message');
const reportService = require('../services/reportService');

// Get comprehensive school summary
exports.getSchoolSummary = async (req, res) => {
  try {
    console.log('📊 Generating comprehensive school summary');
    
    const { from, to, targetClass, targetSection } = req.query;
    
    console.log('📡 Received query params:', { from, to, targetClass, targetSection });
    
    const summary = await reportService.getSchoolSummary(
      req.user.schoolId,
      req.user.schoolCode,
      { from, to, targetClass, targetSection }
    );
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error generating school summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate school summary',
      error: error.message
    });
  }
};

// Get class-wise summary
exports.getClassSummary = async (req, res) => {
  try {
    console.log('📊 Generating class-wise summary');
    
    const { from, to, page = 1, limit = 20 } = req.query;
    
    const classSummary = await reportService.getClassSummary(
      req.user.schoolId,
      req.user.schoolCode,
      { from, to, page: parseInt(page), limit: parseInt(limit) }
    );
    
    res.json({
      success: true,
      data: classSummary
    });
    
  } catch (error) {
    console.error('❌ Error generating class summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate class summary',
      error: error.message
    });
  }
};

// Get detailed class information
exports.getClassDetail = async (req, res) => {
  try {
    console.log('📊 Generating class detail');
    
    const { className } = req.params;
    const { section, from, to, page = 1, limit = 50, search } = req.query;
    
    const classDetail = await reportService.getClassDetail(
      req.user.schoolId,
      req.user.schoolCode,
      className,
      section,
      { from, to, page: parseInt(page), limit: parseInt(limit), search }
    );
    
    res.json({
      success: true,
      data: classDetail
    });
    
  } catch (error) {
    console.error('❌ Error generating class detail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate class detail',
      error: error.message
    });
  }
};

// Get full student profile
exports.getStudentProfile = async (req, res) => {
  try {
    console.log('📊 Generating student profile');
    
    const { studentId } = req.params;
    
    const studentProfile = await reportService.getStudentProfile(
      req.user.schoolId,
      req.user.schoolCode,
      studentId
    );
    
    res.json({
      success: true,
      data: studentProfile
    });
    
  } catch (error) {
    console.error('❌ Error generating student profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate student profile',
      error: error.message
    });
  }
};

// Export data
exports.exportData = async (req, res) => {
  try {
    console.log('📊 Exporting data');
    
    const { type, class: targetClass, section: targetSection, from, to } = req.query;
    
    const csvContent = await reportService.exportToCSV(
      req.user.schoolId,
      req.user.schoolCode,
      type,
      { class: targetClass, section: targetSection, from, to }
    );
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
};

// Get dues list for export
exports.getDuesList = async (req, res) => {
  try {
    console.log('📋 Generating dues list for export');
    
    const { 
      class: targetClass, 
      section: targetSection, 
      status,
      page = 1,
      limit = 1000 // Large limit for export
    } = req.query;
    
    // Build query
    const query = {
      schoolId: req.user.schoolId,
      totalPending: { $gt: 0 } // Only records with outstanding amount
    };
    
    if (targetClass && targetClass !== 'ALL') {
      query.studentClass = targetClass;
    }
    
    if (targetSection && targetSection !== 'ALL') {
      query.studentSection = targetSection;
    }
    
    if (status && status !== 'ALL') {
      query.status = status;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const dues = await StudentFeeRecord.find(query)
      .sort({ totalPending: -1, overdueDays: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Format for export
    const duesList = dues.map(record => ({
      studentName: record.studentName,
      class: record.studentClass,
      section: record.studentSection,
      rollNumber: record.rollNumber,
      feeStructure: record.feeStructureName,
      academicYear: record.academicYear,
      totalAmount: record.totalAmount,
      totalPaid: record.totalPaid,
      totalPending: record.totalPending,
      status: record.status,
      paymentPercentage: record.paymentPercentage,
      nextDueDate: record.nextDueDate,
      overdueDays: record.overdueDays,
      lastPaymentDate: record.payments.length > 0 
        ? record.payments[record.payments.length - 1].paymentDate 
        : null
    }));
    
    res.json({
      success: true,
      data: {
        dues: duesList,
        totalCount: dues.length,
        exportInfo: {
          generatedAt: new Date().toISOString(),
          filters: {
            class: targetClass || 'ALL',
            section: targetSection || 'ALL',
            status: status || 'ALL'
          }
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating dues list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate dues list',
      error: error.message
    });
  }
};

// Get class-wise fee analysis
exports.getClassWiseAnalysis = async (req, res) => {
  try {
    console.log('📊 Generating class-wise fee analysis');
    
    const { academicYear } = req.query;
    
    // Build filter
    const filter = { schoolId: req.user.schoolId };
    if (academicYear) {
      filter.academicYear = academicYear;
    }
    
    // Get class-wise aggregation
    const classAnalysis = await StudentFeeRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            class: '$studentClass',
            section: '$studentSection'
          },
          totalStudents: { $sum: 1 },
          totalBilled: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$totalPaid' },
          totalOutstanding: { $sum: '$totalPending' },
          paidStudents: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          },
          partialStudents: {
            $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] }
          },
          overdueStudents: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
          },
          avgCollectionRate: {
            $avg: {
              $cond: [
                { $gt: ['$totalAmount', 0] },
                { $divide: ['$totalPaid', '$totalAmount'] },
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          class: '$_id.class',
          section: '$_id.section',
          totalStudents: 1,
          totalBilled: 1,
          totalCollected: 1,
          totalOutstanding: 1,
          paidStudents: 1,
          partialStudents: 1,
          overdueStudents: 1,
          collectionPercentage: {
            $multiply: ['$avgCollectionRate', 100]
          },
          _id: 0
        }
      },
      { $sort: { class: 1, section: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        classAnalysis,
        summary: {
          totalClasses: classAnalysis.length,
          totalStudents: classAnalysis.reduce((sum, item) => sum + item.totalStudents, 0),
          totalBilled: classAnalysis.reduce((sum, item) => sum + item.totalBilled, 0),
          totalCollected: classAnalysis.reduce((sum, item) => sum + item.totalCollected, 0),
          totalOutstanding: classAnalysis.reduce((sum, item) => sum + item.totalOutstanding, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating class-wise analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate class-wise analysis',
      error: error.message
    });
  }
};

// Get payment trends
exports.getPaymentTrends = async (req, res) => {
  try {
    console.log('📈 Generating payment trends');
    
    const { period = 'monthly', from, to } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (from) {
      dateFilter.paymentDate = { $gte: new Date(from) };
    }
    if (to) {
      dateFilter.paymentDate = { ...dateFilter.paymentDate, $lte: new Date(to) };
    }
    
    let groupBy;
    let sortBy;
    
    switch (period) {
      case 'daily':
        groupBy = {
          year: { $year: '$payments.paymentDate' },
          month: { $month: '$payments.paymentDate' },
          day: { $dayOfMonth: '$payments.paymentDate' }
        };
        sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
        break;
      case 'weekly':
        groupBy = {
          year: { $year: '$payments.paymentDate' },
          week: { $week: '$payments.paymentDate' }
        };
        sortBy = { '_id.year': 1, '_id.week': 1 };
        break;
      default: // monthly
        groupBy = {
          year: { $year: '$payments.paymentDate' },
          month: { $month: '$payments.paymentDate' }
        };
        sortBy = { '_id.year': 1, '_id.month': 1 };
    }
    
    const trends = await StudentFeeRecord.aggregate([
      { $match: { schoolId: req.user.schoolId } },
      { $unwind: '$payments' },
      { $match: { 'payments.paymentDate': { $exists: true }, ...dateFilter } },
      {
        $group: {
          _id: groupBy,
          totalAmount: { $sum: '$payments.amount' },
          paymentCount: { $sum: 1 },
          avgAmount: { $avg: '$payments.amount' }
        }
      },
      { $sort: sortBy }
    ]);
    
    // Format trends data
    const formattedTrends = trends.map(trend => ({
      period: formatPeriod(trend._id, period),
      totalAmount: trend.totalAmount,
      paymentCount: trend.paymentCount,
      avgAmount: Math.round(trend.avgAmount * 100) / 100
    }));
    
    res.json({
      success: true,
      data: {
        trends: formattedTrends,
        period,
        totalPeriods: trends.length,
        totalAmount: trends.reduce((sum, trend) => sum + trend.totalAmount, 0),
        totalPayments: trends.reduce((sum, trend) => sum + trend.paymentCount, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating payment trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment trends',
      error: error.message
    });
  }
};

// Helper function to format period
function formatPeriod(period, type) {
  switch (type) {
    case 'daily':
      return `${period.year}-${period.month.toString().padStart(2, '0')}-${period.day.toString().padStart(2, '0')}`;
    case 'weekly':
      return `${period.year}-W${period.week.toString().padStart(2, '0')}`;
    default: // monthly
      return `${period.year}-${period.month.toString().padStart(2, '0')}`;
  }
}
