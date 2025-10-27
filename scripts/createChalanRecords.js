const mongoose = require('mongoose');
const Chalan = require('../backend/models/Chalan');
const StudentFeeRecord = require('../backend/models/StudentFeeRecord');
const School = require('../backend/models/School');
const User = require('../backend/models/User');

// Using the same MongoDB connection as the main application
const MONGODB_URI = 'mongodb://localhost:27017/institute_erp';

// Sample data - replace with actual data
const SAMPLE_DATA = {
  schoolId: 'YOUR_SCHOOL_ID',      // Replace with actual school ID
  studentId: 'YOUR_STUDENT_ID',    // Replace with actual student ID
  className: '10',                // Class name
  section: 'A',                   // Section
  installmentName: 'Term 1 Fee',  // Name of the installment
  academicYear: '2024-2025',      // Academic year
  chalans: [                      // Array of chalans to create
    { amount: 2500, dueDate: '2024-11-15' },
    { amount: 3000, dueDate: '2024-12-15' },
    { amount: 2000, dueDate: '2025-01-15' }
  ]
};

async function connectToDatabase() {
  try {
   await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function getNextChalanNumber(schoolId, academicYear) {
  try {
    const school = await School.findById(schoolId).select('schoolCode code').lean();
    if (!school) {
      throw new Error('School not found');
    }
    
    const schoolCode = (school.schoolCode || school.code || 'SCH').toUpperCase();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get the count of chalans for this month to generate sequence
    const count = await Chalan.countDocuments({
      schoolId,
      createdAt: {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      }
    });
    
    const sequence = count + 1;
    return `${schoolCode}-${yearMonth}-${String(sequence).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating chalan number:', error);
    // Fallback number
    return `CHALAN-${Date.now()}`;
  }
}

async function createChalanRecord(data) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log('\n=== Starting chalan creation ===');
    
    // Verify student exists
    const student = await User.findById(data.studentId).session(session);
    if (!student) {
      throw new Error(`Student with ID ${data.studentId} not found`);
    }
    
    // Verify school exists
    const school = await School.findById(data.schoolId).session(session);
    if (!school) {
      throw new Error(`School with ID ${data.schoolId} not found`);
    }
    
    const createdChalans = [];
    
    // Create each chalan
    for (const chalanData of data.chalans) {
      const chalanNumber = await getNextChalanNumber(data.schoolId, data.academicYear);
      
      const chalan = new Chalan({
        chalanNumber,
        schoolId: data.schoolId,
        studentId: data.studentId,
        class: data.className,
        section: data.section,
        amount: chalanData.amount,
        dueDate: new Date(chalanData.dueDate),
        status: 'unpaid',
        installmentName: data.installmentName,
        academicYear: data.academicYear
      });
      
      const savedChalan = await chalan.save({ session });
      createdChalans.push(savedChalan);
      
      console.log(`✅ Created chalan ${chalanNumber} for ${student.name}`);
      
      // Update or create student fee record
      await StudentFeeRecord.findOneAndUpdate(
        {
          schoolId: data.schoolId,
          studentId: data.studentId,
          academicYear: data.academicYear
        },
        {
          $setOnInsert: {
            studentName: student.name,
            studentClass: data.className,
            studentSection: data.section,
            feeStructureName: data.installmentName,
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0
          },
          $inc: { 
            totalAmount: chalanData.amount,
            totalPending: chalanData.amount
          },
          $push: {
            chalans: {
              chalanId: savedChalan._id,
              chalanNumber: savedChalan.chalanNumber,
              issueDate: savedChalan.createdAt,
              dueDate: savedChalan.dueDate,
              amount: savedChalan.amount,
              status: 'unpaid'
            }
          }
        },
        {
          upsert: true,
          new: true,
          session
        }
      );
    }
    
    await session.commitTransaction();
    session.endSession();
    
    console.log('\n=== Chalan creation completed ===');
    console.log(`Created ${createdChalans.length} chalans for student ${student.name}`);
    
    return createdChalans;
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Error creating chalan records:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectToDatabase();
    
    // Replace with actual data or modify SAMPLE_DATA
    const result = await createChalanRecord(SAMPLE_DATA);
    
    console.log('\n✅ Successfully created chalans:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
