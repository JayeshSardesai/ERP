const Chalan = require('../models/chalan');
const School = require('../models/School');
const Counter = require('../models/Counter');
const StudentFeeRecord = require('../models/StudentFeeRecord');
const User = require('../models/User');
const { ObjectId } = require('mongodb');

// Generate a unique chalan number in the format: SCHOOLCODE-YYYYMM-0001
async function generateChalanNumber(schoolId, academicYear, session = null) {
  try {
    console.log('\n=== Starting chalan number generation ===');
    console.log('School ID:', schoolId);
    
    // Get school info
    const school = await School.findById(schoolId).select('schoolCode code').lean();
    if (!school) {
      throw new Error('School not found');
    }
    
    // Get school code (with fallbacks)
    const schoolCode = (school.schoolCode || school.code || 'SCH').toUpperCase();
    console.log('Using school code:', schoolCode);
    
    // Generate counter name based on current month and year
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const counterName = `chalan_${yearMonth}`; // Simplified counter name - one per month
    
    console.log('Using counter:', counterName);
    
    // Get next sequence number
    const sequence = await Counter.getNextSequence(counterName);
    
    // Format the chalan number
    const sequenceStr = String(sequence).padStart(4, '0');
    const chalanNumber = `${schoolCode}-${yearMonth}-${sequenceStr}`;
    
    console.log('Generated chalan number:', chalanNumber);
    console.log('=== End of chalan number generation ===\n');
    
    return chalanNumber;
  } catch (error) {
    console.error('❌ Error in generateChalanNumber:', error);
    
    // Fallback mechanism if counter fails
    if (school && schoolCode) {
      const timestamp = Date.now().toString().slice(-6);
      const fallbackNumber = `FALLBACK-${schoolCode}-${timestamp}`;
      console.warn(`Using fallback chalan number: ${fallbackNumber}`);
      return fallbackNumber;
    }
    
    throw new Error('Failed to generate chalan number');
  }
}

// Get the next chalan number
exports.getNextChalanNumber = async (req, res) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(400).json({ success: false, message: 'School ID is required' });
    }

    // Get current academic year from school or use current year as fallback
    const school = await School.findById(req.user.schoolId).select('academicYear schoolCode code').lean();
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    // Generate the chalan number using the existing function
    const chalanNumber = await generateChalanNumber(req.user.schoolId, school.academicYear);
    
    res.status(200).json({
      success: true,
      chalanNumber
    });
  } catch (error) {
    console.error('Error getting next chalan number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate chalan number',
      error: error.message
    });
  }
};

// Generate chalans for students
exports.generateChalans = async (req, res) => {
  console.group('=== Starting Chalan Generation ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user);
  
  const session = await Chalan.startSession();
  session.startTransaction();
  
  try {
    const { studentIds, amount, dueDate, installmentName } = req.body;
    const { schoolId } = req.user;
    
    console.log(`Generating ${studentIds.length} chalans for school: ${schoolId}`);
    
    // Get school details with academic year and code
    console.log('Fetching school details for ID:', schoolId);
    const school = await School.findById(schoolId).select('settings.academicYear.currentYear code name').lean();
    
    if (!school) {
      console.error('School not found for ID:', schoolId);
      throw new Error('School not found');
    }
    
    console.log('School details:', {
      id: school._id,
      name: school.name,
      code: school.code,
      hasSettings: !!school.settings,
      hasAcademicYear: !!(school.settings?.academicYear?.currentYear)
    });
    
    const academicYear = school?.settings?.academicYear?.currentYear;
    // Use the code field (should be uppercase as per schema)
    const schoolCode = school.code ? school.code.toUpperCase() : 'SCH';
    console.log(`Using school code: ${schoolCode} for chalan generation`);
    
    if (!academicYear) {
      throw new Error('Academic year not configured for this school');
    }
    
    // Get current year and month for counter name
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Generate URL-safe counter name (must match the format in generateChalanNumber)
    const safeSchoolCode = schoolCode.replace(/[^a-zA-Z0-9]/g, '_');
    const counterName = `chalan_${safeSchoolCode}_${yearMonth}`;
    console.log('Using counter name:', counterName);
    
    // Initialize counter if it doesn't exist
    try {
      const counterExists = await Counter.exists({ _id: counterName });
      if (!counterExists) {
        await Counter.create({ _id: counterName, seq: 0 });
        console.log(`✅ Initialized chalan counter: ${counterName}`);
      }
    } catch (error) {
      console.error('⚠️ Could not initialize chalan counter:', error.message);
    }
    
    // Process each student with atomic sequence numbers
    for (let i = 0; i < studentIds.length; i++) {
      // Log before getting sequence
      console.group(`Processing student ${i+1}/${studentIds.length}`);
      
      // Use the generateChalanNumber function to ensure consistent counter usage
      console.log('Generating chalan number...');
      const chalanNumber = await generateChalanNumber(schoolId, academicYear, session);
      
      console.log('Generated chalan number:', {
        chalanNumber,
        studentId: studentIds[i],
        index: i + 1,
        total: studentIds.length
      });
      
      // Create chalan
      const chalan = new Chalan({
        chalanNumber,
        schoolId: new ObjectId(schoolId),
        studentId: new ObjectId(studentIds[i]),
        class: req.body.class,
        section: req.body.section,
        amount,
        dueDate: new Date(dueDate),
        status: 'unpaid',
        installmentName,
        academicYear
      });
      
      // Save the chalan with the generated number
      console.log('Saving chalan to database...');
      // Save the chalan to the database
      const savedChalan = await chalan.save({ session });
      
      console.log(`✅ Chalan created for student ${studentIds[i]}:`, chalanNumber);
      
      // Get student details for fee record
      const student = await User.findById(studentIds[i]).select('name rollNumber').lean();
      if (!student) {
        console.warn(`Student not found: ${studentIds[i]}`);
        continue;
      }
      
      // Create or update student fee record
      const feeRecord = await StudentFeeRecord.findOneAndUpdate(
        {
          schoolId: new ObjectId(schoolId),
          studentId: new ObjectId(studentIds[i]),
          academicYear
        },
        {
          $setOnInsert: {
            studentName: student.name,
            studentClass: req.body.class,
            studentSection: req.body.section,
            rollNumber: student.rollNumber,
            feeStructureName: installmentName || 'Default Fee Structure',
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0,
            installments: [],
            payments: []
          },
          $inc: { totalAmount: amount, totalPending: amount },
          $push: {
            installments: {
              name: installmentName || `Installment ${new Date().toISOString().split('T')[0]}`,
              amount: amount,
              dueDate: new Date(dueDate),
              status: 'pending',
              createdAt: new Date()
            }
          }
        },
        {
          new: true,
          upsert: true,
          session
        }
      );
      
      // Update chalan with fee record reference
      savedChalan.feeRecordId = feeRecord._id;
      await savedChalan.save({ session });
      
      console.log(`✅ Updated fee record for student ${studentIds[i]}`);
      
      try {
        // Add to response with populated student info
        const populatedChalan = await Chalan.findById(savedChalan._id)
          .populate('studentId', 'name admissionNo rollNumber')
          .lean();
        
        // Format the response with all required fields
        const chalanData = {
          ...populatedChalan,
          chalanNumber, // This is the generated chalan number
          studentName: populatedChalan.studentId?.name || 'Unknown Student',
          admissionNumber: populatedChalan.studentId?.admissionNo || '',
          rollNumber: populatedChalan.studentId?.rollNumber || '',
          _id: populatedChalan._id.toString(),
          studentId: populatedChalan.studentId?._id?.toString() || studentIds[i],
          schoolId: schoolId.toString(),
          class: req.body.class,
          section: req.body.section,
          amount,
          totalAmount: amount,
          dueDate: new Date(dueDate).toISOString(),
          status: 'unpaid',
          installmentName: installmentName || 'Fee Payment',
          academicYear,
          copies: populatedChalan.copies || {
            student: '',
            office: '',
            admin: ''
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log(`Chalan ${i+1}/${studentIds.length} created:`, {
          chalanNumber: chalanData.chalanNumber,
          student: chalanData.studentName,
          amount: chalanData.amount
        });
        
        chalans.push(chalanData);
      } catch (populateError) {
        console.error('Error populating chalan data:', populateError);
        // Fallback to basic data if population fails
        chalans.push({
          ...savedChalan.toObject(),
          chalanNumber,
          _id: savedChalan._id.toString(),
          studentId: studentIds[i],
          studentName: 'Unknown Student',
          admissionNumber: '',
          rollNumber: '',
          class: req.body.class,
          section: req.body.section,
          amount,
          totalAmount: amount,
          dueDate: new Date(dueDate).toISOString(),
          status: 'unpaid',
          installmentName: installmentName || 'Fee Payment',
          academicYear,
          copies: { student: '', office: '', admin: '' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    console.log('=== Chalan Generation Complete ===');
    console.log('Total chalans generated:', chalans.length);
    console.log('Generated chalans:', JSON.stringify(chalans.map(c => ({
      _id: c._id,
      chalanNumber: c.chalanNumber,
      studentId: c.studentId,
      amount: c.amount,
      status: c.status
    })), null, 2));
    
    res.status(201).json({
      success: true,
      message: `${chalans.length} chalans generated successfully`,
      data: chalans,
      count: chalans.length
    });
    
    console.groupEnd(); // End the main group
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('=== Error generating chalans ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    console.groupEnd(); // Ensure the group is closed even on error
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate chalans',
      error: error.message
    });
  }
};

// Get chalans with optional filters
exports.getChalans = async (req, res) => {
  try {
    const { status, class: className, section, startDate, endDate } = req.query;
    const { schoolId } = req.user;
    
    const query = { schoolId: new ObjectId(schoolId) };
    
    if (status) query.status = status;
    if (className) query.class = className;
    if (section) query.section = section;
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const chalans = await Chalan.find(query)
      .populate('studentId', 'name rollNumber admissionNo')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: chalans
    });
    
  } catch (error) {
    console.error('Error fetching chalans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chalans',
      error: error.message
    });
  }
};

// Get chalan by ID
exports.getChalanById = async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = req.user;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chalan ID format'
      });
    }
    
    const chalan = await Chalan.findOne({
      _id: new ObjectId(id),
      schoolId: new ObjectId(schoolId)
    }).populate('studentId', 'name rollNumber admissionNo');
    
    if (!chalan) {
      return res.status(404).json({
        success: false,
        message: 'Chalan not found'
      });
    }
    
    res.json({
      success: true,
      data: chalan
    });
    
  } catch (error) {
    console.error('Error fetching chalan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chalan',
      error: error.message
    });
  }
};

// Get raw chalan data for a student (for debugging/development)
exports.getStudentChalanData = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { schoolId } = req.user;
    
    if (!ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }
    
    // Find all fee records for this student
    const feeRecords = await StudentFeeRecord.find({
      schoolId: new ObjectId(schoolId),
      studentId: new ObjectId(studentId)
    });
    
    if (!feeRecords || feeRecords.length === 0) {
      return res.json({
        success: true,
        message: 'No fee records found for this student',
        data: []
      });
    }
    
    // Extract all chalans from all fee records
    const allChalans = [];
    
    feeRecords.forEach(record => {
      if (record.chalans && record.chalans.length > 0) {
        record.chalans.forEach(chalan => {
          allChalans.push({
            feeRecordId: record._id,
            academicYear: record.academicYear,
            ...chalan.toObject ? chalan.toObject() : chalan
          });
        });
      }
    });
    
    // Sort by academic year and due date
    allChalans.sort((a, b) => {
      if (a.academicYear !== b.academicYear) {
        return b.academicYear.localeCompare(a.academicYear);
      }
      return new Date(b.dueDate) - new Date(a.dueDate);
    });
    
    res.json({
      success: true,
      count: allChalans.length,
      data: allChalans
    });
    
  } catch (error) {
    console.error('Error fetching chalan data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chalan data',
      error: error.message
    });
  }
};

// Get chalans by student ID from StudentFeeRecord
exports.getChalansByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { schoolId } = req.user;
    const { status, academicYear: year } = req.query;
    
    if (!ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }
    
    // Get the academic year from query or school settings
    let academicYear = year;
    if (!academicYear) {
      const school = await School.findById(schoolId).select('settings.academicYear.currentYear').lean();
      academicYear = school?.settings?.academicYear?.currentYear;
      
      if (!academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Academic year not configured for this school'
        });
      }
    }
    
    // Build the query
    const query = {
      schoolId: new ObjectId(schoolId),
      studentId: new ObjectId(studentId),
      academicYear
    };
    
    // Find the fee record for this student and academic year
    const feeRecord = await StudentFeeRecord.findOne(query);
    
    if (!feeRecord || !feeRecord.chalans || feeRecord.chalans.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Filter chalans by status if provided
    let chalans = feeRecord.chalans;
    if (status) {
      chalans = chalans.filter(ch => ch.status === status);
    }
    
    // Get student details
    const student = await User.findById(studentId)
      .select('name rollNumber admissionNo class section')
      .lean();
    
    // Format the response
    const formattedChalans = chalans.map(chalan => ({
      _id: chalan.chalanId || chalan._id,
      chalanNumber: chalan.chalanNumber,
      studentId: feeRecord.studentId,
      studentName: feeRecord.studentName,
      rollNumber: feeRecord.rollNumber || student?.rollNumber,
      admissionNo: student?.admissionNo || '',
      class: feeRecord.studentClass || student?.class,
      section: feeRecord.studentSection || student?.section,
      amount: chalan.amount,
      paidAmount: chalan.paidAmount || 0,
      dueDate: chalan.dueDate,
      status: chalan.status,
      paymentDate: chalan.paymentDate,
      paymentMethod: chalan.paymentMethod,
      paymentDetails: chalan.paymentDetails,
      installmentName: chalan.installmentName || 'Fee Payment',
      academicYear: feeRecord.academicYear,
      createdAt: chalan.createdAt || chalan.issueDate,
      updatedAt: chalan.updatedAt || chalan.issueDate,
      feeRecordId: feeRecord._id
    }));
    
    // Sort by due date (ascending - oldest first)
    formattedChalans.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    res.json({
      success: true,
      data: formattedChalans,
      student: {
        _id: studentId,
        name: feeRecord.studentName || student?.name,
        rollNumber: feeRecord.rollNumber || student?.rollNumber,
        admissionNo: student?.admissionNo,
        class: feeRecord.studentClass || student?.class,
        section: feeRecord.studentSection || student?.section
      },
      feeSummary: {
        totalAmount: feeRecord.totalAmount || 0,
        totalPaid: feeRecord.totalPaid || 0,
        totalPending: feeRecord.totalPending || 0,
        status: feeRecord.status || 'pending'
      }
    });
    
  } catch (error) {
    console.error('Error fetching student chalans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student chalans',
      error: error.message
    });
  }
};

// Mark chalan as paid
exports.markAsPaid = async (req, res) => {
  const session = await Chalan.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { paymentId, paymentDate = new Date() } = req.body;
    const { schoolId } = req.user;
    
    const chalan = await Chalan.findOne({
      _id: new ObjectId(id),
      schoolId: new ObjectId(schoolId),
      status: 'unpaid'
    });
    
    if (!chalan) {
      return res.status(404).json({
        success: false,
        message: 'Chalan not found or already paid'
      });
    }
    
    // Update chalan status to paid
    chalan.status = 'paid';
    chalan.paymentDate = new Date();
    chalan.paymentMethod = paymentMethod;
    chalan.paymentDetails = paymentDetails;
    
    await chalan.save({ session });
    
    // Update student fee record if it exists
    if (chalan.feeRecordId) {
      await StudentFeeRecord.updateOne(
        { 
          _id: chalan.feeRecordId,
          'installments._id': chalan.installmentId || null
        },
        {
          $inc: { 
            totalPaid: chalan.amount,
            totalPending: -chalan.amount,
            'installments.$.paidAmount': chalan.amount,
            'installments.$.pendingAmount': -chalan.amount
          },
          $set: {
            'installments.$.status': 'paid',
            'installments.$.paidDate': new Date()
          },
          $push: {
            payments: {
              paymentId: chalan._id,
              amount: chalan.amount,
              paymentDate: new Date(),
              paymentMethod: paymentMethod,
              reference: paymentDetails?.reference || `Chalan-${chalan.chalanNumber}`,
              status: 'completed'
            }
          }
        },
        { session }
      );
      
      console.log(`✅ Updated fee record for chalan ${chalan._id}`);
    }
    
    // Here you would typically create a payment record as well
    // await Payment.create([{
    //   chalanId: chalan._id,
    //   amount: chalan.amount,
    //   paymentDate: new Date(paymentDate),
    //   // ... other payment details
    // }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      success: true,
      message: 'Chalan marked as paid',
      data: chalan
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error marking chalan as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chalan status',
      error: error.message
    });
  }
};
