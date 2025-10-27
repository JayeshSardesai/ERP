const FeeStructure = require('../models/FeeStructure');
const StudentFeeRecord = require('../models/StudentFeeRecord');
const School = require('../models/School');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
const { ObjectId } = require('mongodb');
const PDFDocument = require('pdfkit');

// Create fee structure (per-school DB)
exports.createFeeStructure = async (req, res) => {
  try {
    console.log('💰 Creating fee structure:', req.body);
    
    const {
      name,
      description,
      class: targetClass,
      section = 'ALL',
      totalAmount,
      installments,
      academicYear: _clientAcademicYear,
      applyToStudents = false
    } = req.body;
    
    // Centralized academic year from School settings; ignore client-provided value
    const schoolDoc = await School.findById(req.user.schoolId).select('settings.academicYear.currentYear').lean();
    const resolvedAcademicYear = schoolDoc?.settings?.academicYear?.currentYear || _clientAcademicYear || null;
    
    // Validate required fields
    if (!name || !targetClass || !totalAmount || !installments || !resolvedAcademicYear) {
      return res.status(400).json({
        success: false,
        message: 'Name, class, total amount, installments, and academic year are required (school current academic year is missing)'
      });
    }
    
    // Validate installments
    if (!Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one installment is required'
      });
    }
    
    // Validate installment amounts sum to total
    const installmentsSum = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    if (Math.abs(installmentsSum - totalAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Sum of installment amounts must equal total amount'
      });
    }
    
    // Per-school DB connection
    const schoolCode = req.user.schoolCode;
    const conn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = conn.db || conn;
    const feeStructuresCol = db.collection('feestructures');

    // Create fee structure in school DB
    const feeStructureData = {
      schoolId: new ObjectId(req.user.schoolId),
      createdBy: new ObjectId(req.user._id),
      name,
      description,
      class: targetClass,
      section,
      totalAmount,
      installments: installments.map(inst => ({
        name: inst.name,
        amount: inst.amount,
        dueDate: new Date(inst.dueDate),
        description: inst.description,
        isOptional: inst.isOptional || false,
        lateFeeAmount: inst.lateFeeAmount || 0,
        lateFeeAfter: inst.lateFeeAfter ? new Date(inst.lateFeeAfter) : null
      })),
      academicYear: resolvedAcademicYear,
      isActive: true,
      status: 'active',
      appliedToStudents: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const insertRes = await feeStructuresCol.insertOne(feeStructureData);
    const feeStructure = { _id: insertRes.insertedId, ...feeStructureData };
    console.log(`✅ Fee structure created: ${feeStructure._id}`);
    
    // Apply to students if requested
    let appliedCount = 0;
    if (applyToStudents) {
      appliedCount = await applyFeeStructureToStudents_PerschoolDB(feeStructure, schoolCode);
    }
    
    res.json({
      success: true,
      message: 'Fee structure created successfully',
      data: {
        feeStructureId: feeStructure._id,
        appliedToStudents: appliedCount
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating fee structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create fee structure',
      error: error.message
    });
  }
};

// Download receipt as PDF by receiptNumber (per-school DB)
exports.downloadReceiptPdf = async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    const schoolCode = req.user.schoolCode;
    const conn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = conn.db || conn;
    const studentFeeCol = db.collection('studentfeerecords');

    // Find record containing this receipt
    const feeRecord = await studentFeeCol.findOne({
      schoolId: new ObjectId(req.user.schoolId),
      'payments.receiptNumber': receiptNumber
    });
    if (!feeRecord) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    // Identify payment and installment
    const payment = (feeRecord.payments || []).find(p => p.receiptNumber === receiptNumber);
    const installmentName = payment?.installmentName || '';
    const installment = (feeRecord.installments || []).find(i => i.name === installmentName);

    // Aggregate installment payments
    const instPayments = (feeRecord.payments || []).filter(p => p.installmentName === installmentName);
    const instPaid = instPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const instAmount = installment?.amount || 0;
    const instPending = Math.max(0, instAmount - instPaid);

    // Overall
    const totalAmount = feeRecord.totalAmount || 0;
    const totalPaid = feeRecord.totalPaid || 0;
    const totalPending = Math.max(0, totalAmount - totalPaid);

    // Prepare PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receiptNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // Helpers
    const formatINR = (val) => `INR ${new Intl.NumberFormat('en-IN').format(Number(val || 0))}`;

    // Header
    const schoolTitle = feeRecord.schoolName || (req.user && req.user.schoolCode) || 'School';
    doc.fontSize(18).text(schoolTitle, { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(14).text(`Receipt: ${receiptNumber}`, { align: 'left' });
    doc.moveDown();

    // Student details
    doc.fontSize(11).text(`Student: ${feeRecord.studentName || '-'}`);
    doc.text(`Class/Section: ${(feeRecord.studentClass || '-')}/${(feeRecord.studentSection || '-')}`);
    doc.text(`Academic Year: ${feeRecord.academicYear || '-'}`);
    if (feeRecord.rollNumber) doc.text(`Roll No: ${feeRecord.rollNumber}`);
    doc.moveDown();

    // Payment details
    const payDate = payment?.paymentDate ? new Date(payment.paymentDate) : null;
    const dateStr = payDate ? payDate.toLocaleDateString() : '-';
    const dayStr = payDate ? payDate.toLocaleDateString('en-IN', { weekday: 'long' }) : '-';
    doc.fontSize(12).text('Payment', { underline: true });
    doc.fontSize(11).text(`Installment: ${installmentName || '-'}`);
    doc.text(`Paid on: ${dateStr} (${dayStr})`);
    doc.text(`Amount: ${formatINR(payment?.amount)}`);
    doc.text(`Method: ${payment?.paymentMethod || '-'}`);
    doc.text(`Reference: ${payment?.paymentReference || '-'}`);
    doc.moveDown(0.8);

    // Installment summary with history
    doc.fontSize(12).text('Installment Summary', { underline: true });
    doc.fontSize(11).text(`Installment: ${installmentName || '-'}`);
    doc.text(`Installment Total: ${formatINR(instAmount)}`);
    doc.text(`Paid So Far: ${formatINR(instPaid)}`);
    doc.text(`Pending in Installment: ${formatINR(instPending)}`);
    doc.moveDown(0.5);
    doc.fontSize(12).text('Payments in this Installment', { underline: true });
    doc.moveDown(0.3);
    (instPayments || []).forEach(p => {
      const d = p.paymentDate ? new Date(p.paymentDate) : null;
      const dStr = d ? d.toLocaleDateString() : '-';
      const dyStr = d ? d.toLocaleDateString('en-IN', { weekday: 'long' }) : '-';
      doc.fontSize(10).text(`- ${dStr} (${dyStr}) | ${formatINR(p.amount)} | ${p.paymentMethod || '-'} | ref: ${p.paymentReference || '-'} | receipt: ${p.receiptNumber || '-'}`);
    });
    if (!instPayments || instPayments.length === 0) {
      doc.fontSize(10).text('- No payments recorded for this installment');
    }
    doc.moveDown();

    // Overall summary
    doc.fontSize(12).text('Overall Fees', { underline: true });
    doc.fontSize(11).text(`Total Fees: ${formatINR(totalAmount)}`);
    doc.text(`Total Paid: ${formatINR(totalPaid)}`);
    doc.text(`Remaining Fees: ${formatINR(totalPending)}`);
    doc.moveDown();

    // Signature and stamp section
    doc.moveDown(2);
    const startY = doc.y + 20;
    // Principal signature line (left)
    const leftX = doc.page.margins.left;
    doc.moveTo(leftX, startY).lineTo(leftX + 200, startY).stroke();
    doc.fontSize(10).text('Principal Signature', leftX, startY + 6);
    // School stamp box (right)
    const pageWidth = doc.page.width;
    const rightX = pageWidth - doc.page.margins.right - 160;
    doc.rect(rightX, startY - 30, 160, 90).stroke();
    doc.fontSize(10).text('School Stamp', rightX + 40, startY + 40);

    // Footer
    doc.moveDown(2);
    doc.fontSize(9).text(`Generated on ${new Date().toLocaleString()}`);

    doc.end();
  } catch (error) {
    console.error('❌ Error generating receipt PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate receipt PDF', error: error.message });
    }
  }
};

// Get a single student fee record (including payments) (per-school DB)
exports.getStudentFeeRecord = async (req, res) => {
  try {
    const { studentId } = req.params; // can be fee record _id or studentId
    const schoolCode = req.user.schoolCode;
    const conn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = conn.db || conn;
    const studentFeeCol = db.collection('studentfeerecords');

    let feeRecord = null;
    try {
      const objId = new ObjectId(studentId);
      feeRecord = await studentFeeCol.findOne({
        $or: [{ _id: objId }, { studentId: objId }],
        schoolId: new ObjectId(req.user.schoolId)
      });
    } catch (e) {
      feeRecord = await studentFeeCol.findOne({
        schoolId: new ObjectId(req.user.schoolId),
        rollNumber: studentId
      });
    }

    if (!feeRecord) {
      return res.status(404).json({ success: false, message: 'Student fee record not found' });
    }

    return res.json({
      success: true,
      data: {
        id: feeRecord._id,
        studentId: feeRecord.studentId,
        studentName: feeRecord.studentName,
        studentClass: feeRecord.studentClass,
        studentSection: feeRecord.studentSection,
        rollNumber: feeRecord.rollNumber,
        feeStructureName: feeRecord.feeStructureName,
        totalAmount: feeRecord.totalAmount,
        totalPaid: feeRecord.totalPaid,
        totalPending: feeRecord.totalPending,
        status: feeRecord.status,
        installments: (feeRecord.installments || []).map(inst => ({
          name: inst.name,
          amount: inst.amount,
          paidAmount: inst.paidAmount || 0,
          dueDate: inst.dueDate || null,
          status: inst.status || 'pending'
        })),
        payments: (feeRecord.payments || []).map(p => ({
          paymentId: p.paymentId,
          installmentName: p.installmentName,
          amount: p.amount,
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          paymentReference: p.paymentReference,
          receiptNumber: p.receiptNumber,
          isVerified: p.isVerified
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching student fee record:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student fee record', error: error.message });
  }
};

// Apply fee structure to students (per-school DB)
async function applyFeeStructureToStudents_PerschoolDB(feeStructure, schoolCode) {
  try {
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db || connection;
    
    // Build student query (robust across possible schemas)
    // Prepare matching for either schoolId or schoolCode (case-insensitive)
    const schoolIdObj = new ObjectId(feeStructure.schoolId);
    const codeRaw = String(schoolCode || '').trim();
    const codeUpper = codeRaw.toUpperCase();
    const codeLower = codeRaw.toLowerCase();
    const schoolMatchOr = [
      { schoolId: schoolIdObj },
      { schoolId: String(schoolIdObj) },
      { schoolCode: codeRaw },
      { schoolCode: codeUpper },
      { schoolCode: codeLower }
    ];
    // We'll prepare two bases: one for 'students' collection (no role field), one for 'users' (role: 'student')
    const baseForStudentsCol = {
      _placeholder: { $ne: true },
      $or: schoolMatchOr
    };
    const baseForUsersCol = {
      role: 'student',
      _placeholder: { $ne: true },
      $or: schoolMatchOr
    };
    const andFilters = [];

    if (feeStructure.class !== 'ALL') {
      const cls = String(feeStructure.class).trim();
      andFilters.push({
        $or: [
          { class: cls },
          { studentClass: cls },
          { currentClass: cls },
          { grade: cls },
          { 'studentDetails.currentClass': cls },
          // Also try numeric if possible
          ...(isNaN(Number(cls)) ? [] : [
            { class: Number(cls) },
            { studentClass: Number(cls) },
            { currentClass: Number(cls) },
            { grade: Number(cls) },
          ])
        ]
      });
    }

    if (feeStructure.section !== 'ALL') {
      const sec = String(feeStructure.section).trim();
      const secUpper = sec.toUpperCase();
      const secLower = sec.toLowerCase();
      andFilters.push({
        $or: [
          { section: sec },
          { section: secUpper },
          { section: secLower },
          { studentSection: sec },
          { studentSection: secUpper },
          { studentSection: secLower },
          { currentSection: sec },
          { sectionName: sec },
          { sectionName: secUpper },
          { sectionName: secLower },
          { 'studentDetails.currentSection': sec }
        ]
      });
    }

    // Try 'students' collection first (most schools store student docs here)
    const studentsCol = db.collection('students');
    const usersCol = db.collection('users');
    const studentQueryForStudentsCol = andFilters.length > 0
      ? { ...baseForStudentsCol, $and: andFilters }
      : baseForStudentsCol;
    const countStudentsCol = await studentsCol.countDocuments(studentQueryForStudentsCol).catch(() => 0);

    let students = [];
    let usedCollection = 'students';

    if (countStudentsCol > 0) {
      console.log('[Fees] Using students collection for application');
      students = await studentsCol.find(studentQueryForStudentsCol).toArray();
    } else {
      // Fallback to users collection with role: 'student'
      const studentQueryForUsersCol = andFilters.length > 0
        ? { ...baseForUsersCol, $and: andFilters }
        : baseForUsersCol;
      console.log('[Fees] Using users collection (role: student) for application');
      students = await usersCol.find(studentQueryForUsersCol).toArray();
      usedCollection = 'users';
    }

    console.log(`👥 Found ${students.length} students for fee structure application (source: ${usedCollection})`);
  
    // Create student fee records
    const studentFeeRecords = students.map(student => {
    const resolvedClass = student.class ?? student.studentClass ?? student.currentClass ?? student?.studentDetails?.currentClass ?? null;
    const resolvedSection = student.section ?? student.studentSection ?? student.currentSection ?? student?.studentDetails?.currentSection ?? null;
    const resolvedRoll = student.rollNumber ?? student.rollno ?? student.admNo ?? null;
    const resolvedName = student.name?.displayName || [student.name?.firstName, student.name?.lastName].filter(Boolean).join(' ') || student.fullName || student.username || 'Student';
      return ({
    schoolId: new ObjectId(feeStructure.schoolId),
    studentId: new ObjectId(student._id),
    feeStructureId: new ObjectId(feeStructure._id),
    studentName: resolvedName,
    studentClass: resolvedClass,
    studentSection: resolvedSection,
    rollNumber: resolvedRoll,
    feeStructureName: feeStructure.name,
    academicYear: feeStructure.academicYear,
    totalAmount: feeStructure.totalAmount,
    installments: feeStructure.installments.map(inst => ({
      installmentId: new ObjectId(),
      name: inst.name,
      amount: inst.amount,
      dueDate: inst.dueDate,
      paidAmount: 0,
      status: 'pending',
      lateFeeAmount: inst.lateFeeAmount,
      remarks: ''
    })),
    payments: [],
    status: 'pending',
    totalPaid: 0,
    totalPending: feeStructure.totalAmount,
    createdAt: new Date(),
    updatedAt: new Date()
    });
    });
  
    // Bulk insert student fee records
    if (studentFeeRecords.length > 0) {
      const studentFeeCol = db.collection('studentfeerecords');
      await studentFeeCol.insertMany(studentFeeRecords);
      console.log(`✅ Created ${studentFeeRecords.length} student fee records`);
    }

    // Update fee structure with applied count in per-school DB
    const feeStructuresCol = db.collection('feestructures');
    await feeStructuresCol.updateOne(
      { _id: new ObjectId(feeStructure._id) },
      { $set: { appliedToStudents: students.length, updatedAt: new Date() } }
    );
    
    return students.length;
    
  } catch (error) {
    console.error('❌ Error applying fee structure to students:', error);
    throw error;
  }
}

// Get fee structures (per-school DB)
exports.getFeeStructures = async (req, res) => {
  try {
    const { class: targetClass, section: targetSection } = req.query;

    const schoolCode = req.user.schoolCode;
    const conn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = conn.db || conn;
    const feeStructuresCol = db.collection('feestructures');

    const query = {
      schoolId: new ObjectId(req.user.schoolId),
      isActive: true
    };
    if (targetClass && targetClass !== 'ALL') query.class = targetClass;
    if (targetSection && targetSection !== 'ALL') query.section = targetSection;

    const feeStructures = await feeStructuresCol
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      data: feeStructures.map(structure => ({
        id: structure._id,
        name: structure.name,
        description: structure.description,
        class: structure.class,
        section: structure.section,
        totalAmount: structure.totalAmount,
        installmentsCount: (structure.installments || []).length,
        academicYear: structure.academicYear,
        appliedToStudents: structure.appliedToStudents,
        status: structure.status,
        createdAt: structure.createdAt,
        createdBy: 'Admin'
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching fee structures:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fee structures',
      error: error.message
    });
  }
};

// Get student fee records (per-school DB)
exports.getStudentFeeRecords = async (req, res) => {
  try {
    const { 
      class: targetClass, 
      section: targetSection, 
      page = 1, 
      limit = 20,
      search,
      status
    } = req.query;
    
    const schoolCode = req.user.schoolCode;
    const conn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = conn.db || conn;
    const studentFeeCol = db.collection('studentfeerecords');

    // Build query (robust matching for class/section)
    const query = { schoolId: new ObjectId(req.user.schoolId) };
    const andFilters = [];

    if (targetClass && targetClass !== 'ALL') {
      const clsRaw = String(targetClass).trim();
      const clsNumber = Number(clsRaw.replace(/[^0-9]/g, ''));
      const clsCandidate = clsRaw.replace(/^class\s*/i, '').trim() || clsRaw;
      andFilters.push({
        $or: [
          { studentClass: clsCandidate },
          ...(isNaN(clsNumber) ? [] : [
            { studentClass: String(clsNumber) },
            { studentClass: clsNumber },
          ])
        ]
      });
    }
    
    if (targetSection && targetSection !== 'ALL') {
      const sec = String(targetSection).trim();
      andFilters.push({
        $or: [
          { studentSection: { $regex: `^${sec}$`, $options: 'i' } }
        ]
      });
    }

    if (andFilters.length) {
      query.$and = andFilters;
    }
    
    if (status && status !== 'ALL') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { feeStructureName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const cursor = studentFeeCol
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const records = await cursor.toArray();
    
    // Get total count for pagination
    const totalRecords = await studentFeeCol.countDocuments(query);
    
    // Format response (now includes installments[])
    const formattedRecords = records.map(record => ({
      id: record._id,
      studentId: record.studentId,
      studentName: record.studentName,
      studentClass: record.studentClass,
      studentSection: record.studentSection,
      rollNumber: record.rollNumber,
      feeStructureName: record.feeStructureName,
      totalAmount: record.totalAmount,
      totalPaid: record.totalPaid,
      totalPending: record.totalPending,
      status: record.status,
      paymentPercentage: record.paymentPercentage,
      nextDueDate: record.nextDueDate,
      overdueDays: record.overdueDays,
      installments: (record.installments || []).map(inst => ({
        name: inst.name,
        amount: inst.amount,
        paidAmount: inst.paidAmount || 0,
        dueDate: inst.dueDate || null,
        status: inst.status || 'pending'
      }))
    }));
    
    res.json({
      success: true,
      data: {
        records: formattedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRecords,
          pages: Math.ceil(totalRecords / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching student fee records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student fee records',
      error: error.message
    });
  }
};

// Record offline payment (per-school DB)
exports.recordOfflinePayment = async (req, res) => {
  try {
    console.log('💳 Recording offline payment:', req.body);
    
    const { studentId } = req.params; // can be fee record _id or studentId
    const {
      installmentName,
      amount,
      paymentDate,
      paymentMethod,
      paymentReference,
      remarks
    } = req.body;
    
    // Validate required fields
    if (!installmentName || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Installment name, amount, and payment method are required'
      });
    }
    
    // Validate payment date is provided
    if (!paymentDate) {
      return res.status(400).json({
        success: false,
        message: 'Payment date is required'
      });
    }
    
    const schoolCode = req.user.schoolCode;
    const conn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = conn.db || conn;
    const studentFeeCol = db.collection('studentfeerecords');

    // Find student fee record: accept either fee record _id or studentId
    console.log('[Fees] recordOfflinePayment param studentId:', studentId, 'schoolId:', req.user.schoolId);
    let feeRecord = null;
    try {
      const objId = new ObjectId(studentId);
      const query = {
        $or: [
          { _id: objId },
          { studentId: objId }
        ],
        schoolId: new ObjectId(req.user.schoolId)
      };
      console.log('[Fees] Lookup with ObjectId using query:', JSON.stringify(query));
      feeRecord = await studentFeeCol.findOne(query);
    } catch (e) {
      // Not a valid ObjectId, fallback to string match on rollNumber (unlikely)
      const altQuery = {
        schoolId: new ObjectId(req.user.schoolId),
        rollNumber: studentId
      };
      console.log('[Fees] Non-ObjectId param, fallback query:', JSON.stringify(altQuery));
      feeRecord = await studentFeeCol.findOne(altQuery);
    }
    
    if (!feeRecord) {
      console.warn('[Fees] Student fee record not found for param:', studentId);
      return res.status(404).json({
        success: false,
        message: 'Student fee record not found'
      });
    }
    
    // Check if installment exists
    const installment = (feeRecord.installments || []).find(inst => inst.name === installmentName);
    if (!installment) {
      return res.status(400).json({
        success: false,
        message: 'Installment not found in fee structure'
      });
    }
    
    // Generate sequential receipt number per-school and per-academicYear
    // Use atomic counter in per-school DB to avoid collisions under concurrency
    const countersCol = db.collection('counters');
    const counterKey = `receipt:${String(req.user.schoolId)}:${String(feeRecord.academicYear || '')}`;
    const seqDoc = await countersCol.findOneAndUpdate(
      { _id: counterKey },
      {
        $setOnInsert: {
          schoolId: new ObjectId(req.user.schoolId),
          academicYear: feeRecord.academicYear || null,
          createdAt: new Date(),
        },
        $inc: { seq: 1 },
        $set: { updatedAt: new Date() }
      },
      { upsert: true, returnDocument: 'after', returnOriginal: false }
    );
    // Fallback in case driver option didn't return the updated doc
    let seqVal = (seqDoc && seqDoc.value && typeof seqDoc.value.seq === 'number') ? seqDoc.value.seq : undefined;
    if (typeof seqVal !== 'number') {
      const doc = await countersCol.findOne({ _id: counterKey });
      seqVal = (doc && typeof doc.seq === 'number') ? doc.seq : 1;
    }
    const seq = seqVal;
    const seqPadded = String(seq).padStart(5, '0');
    const schoolCodeStr = (typeof schoolCode === 'string' && schoolCode) ? schoolCode : (req.user.schoolCode || 'SCH');
    const academicYear = feeRecord.academicYear || 'AY';
    const receiptNumber = `RCP-${schoolCodeStr}-${academicYear}-${seqPadded}`;
    
    // Create payment record
    const payment = {
      paymentId: new ObjectId(),
      installmentName,
      amount: parseFloat(amount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod,
      paymentReference: paymentReference || '',
      receivedBy: new ObjectId(req.user._id),
      remarks: remarks || '',
      receiptNumber,
      isVerified: false
    };
    
    // Push payment and recompute fields
    const updatedPayments = [...(feeRecord.payments || []), payment];

    // Recompute totals and installment statuses
    const totalPaid = updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = Math.max(0, (feeRecord.totalAmount || 0) - totalPaid);

    const installments = (feeRecord.installments || []).map(inst => {
      const paid = updatedPayments
        .filter(p => p.installmentName === inst.name)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      let status = 'pending';
      if (paid >= inst.amount) status = 'paid';
      else if (paid > 0) status = 'partial';
      else if (new Date() > new Date(inst.dueDate)) status = 'overdue';
      return { ...inst, paidAmount: paid, status };
    });

    // Overall status
    let status = 'pending';
    if (totalPaid >= (feeRecord.totalAmount || 0)) status = 'paid';
    else if (totalPaid > 0) status = 'partial';
    else if (installments.some(i => i.status === 'overdue')) status = 'overdue';

    // Overdue days and nextDueDate
    const overdueInst = installments.filter(i => i.status === 'overdue');
    let overdueDays = feeRecord.overdueDays || 0;
    if (overdueInst.length > 0) {
      const oldest = overdueInst.reduce((o, i) => (!o || new Date(i.dueDate) < new Date(o.dueDate) ? i : o), null);
      overdueDays = Math.max(0, Math.floor((Date.now() - new Date(oldest.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
    }
    const pendingInst = installments.filter(i => i.status === 'pending');
    const nextDueDate = pendingInst.length > 0
      ? pendingInst.reduce((n, i) => (!n || new Date(i.dueDate) < new Date(n.dueDate) ? i : n), null).dueDate
      : null;

    await studentFeeCol.updateOne(
      { _id: new ObjectId(feeRecord._id) },
      {
        $set: {
          payments: updatedPayments,
          installments,
          totalPaid,
          totalPending,
          status,
          overdueDays,
          nextDueDate,
          updatedAt: new Date(),
        }
      }
    );
    
    console.log(`✅ Payment recorded: ${receiptNumber}`);
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        receiptNumber: payment.receiptNumber,
        paymentId: payment.paymentId,
        // Return recalculated values
        totalPaid,
        totalPending,
        status
      }
    });
    
  } catch (error) {
    console.error('❌ Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

// Get fee statistics (per-school DB)
exports.getFeeStats = async (req, res) => {
  try {
    const schoolCode = req.user.schoolCode;
    const conn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = conn.db || conn;
    const studentFeeCol = db.collection('studentfeerecords');

    // Get aggregated statistics
    const stats = await studentFeeCol.aggregate([
      { $match: { schoolId: new ObjectId(req.user.schoolId) } },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$totalPaid' },
          totalOutstanding: { $sum: '$totalPending' },
          totalRecords: { $sum: 1 },
          paidRecords: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          partialRecords: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
          overdueRecords: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
        }
      }
    ]).toArray();
    
    const result = stats[0] || {
      totalBilled: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalRecords: 0,
      paidRecords: 0,
      partialRecords: 0,
      overdueRecords: 0
    };
    
    const collectionPercentage = result.totalBilled > 0 
      ? Math.round((result.totalCollected / result.totalBilled) * 100) 
      : 0;
    
    res.json({
      success: true,
      data: {
        totalBilled: result.totalBilled,
        totalCollected: result.totalCollected,
        totalOutstanding: result.totalOutstanding,
        collectionPercentage,
        totalRecords: result.totalRecords,
        paidRecords: result.paidRecords,
        partialRecords: result.partialRecords,
        overdueRecords: result.overdueRecords
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching fee stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fee statistics',
      error: error.message
    });
  }
};
