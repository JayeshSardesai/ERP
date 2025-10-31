const mongoose = require('mongoose');
const StudentFeeRecord = require('../backend/models/StudentFeeRecord');

// Default MongoDB connection string
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/erp';

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose.connect(DEFAULT_MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function viewChalanData(studentId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      console.error('Invalid student ID format');
      process.exit(1);
    }

    console.log(`\n=== Fetching chalan data for student ${studentId} ===\n`);
    
    // Find all fee records for this student
    const feeRecords = await StudentFeeRecord.find({
      studentId: new mongoose.Types.ObjectId(studentId)
    });

    if (!feeRecords || feeRecords.length === 0) {
      console.log('No fee records found for this student');
      return;
    }

    console.log(`Found ${feeRecords.length} fee record(s):\n`);

    feeRecords.forEach((record, index) => {
      console.log(`=== Fee Record ${index + 1} ===`);
      console.log(`Academic Year: ${record.academicYear || 'N/A'}`);
      console.log(`Student: ${record.studentName || 'N/A'} (${record.studentId})`);
      console.log(`Class: ${record.studentClass || 'N/A'}, Section: ${record.studentSection || 'N/A'}`);
      console.log(`Total Amount: ${record.totalAmount || 0}`);
      console.log(`Total Paid: ${record.totalPaid || 0}`);
      console.log(`Total Pending: ${record.totalPending || 0}`);
      
      // Display chalans
      if (record.chalans && record.chalans.length > 0) {
        console.log(`\nChalans (${record.chalans.length}):`);
        console.log('----------------------------------------');
        record.chalans.forEach((chalan, chalanIndex) => {
          console.log(`\nChalan #${chalanIndex + 1}:`);
          console.log(`  ID: ${chalan._id || 'N/A'}`);
          console.log(`  Number: ${chalan.chalanNumber || 'N/A'}`);
          console.log(`  Amount: ${chalan.amount || 0}`);
          console.log(`  Status: ${chalan.status || 'N/A'}`);
          console.log(`  Due Date: ${chalan.dueDate || 'N/A'}`);
          console.log(`  Created: ${chalan.createdAt || 'N/A'}`);
          
          if (chalan.paymentDate) {
            console.log(`  Payment Date: ${chalan.paymentDate}`);
            console.log(`  Payment Method: ${chalan.paymentMethod || 'N/A'}`);
          }
          
          if (chalan.installmentName) {
            console.log(`  Installment: ${chalan.installmentName}`);
          }
          
          console.log('----------------------------------------');
        });
      } else {
        console.log('\nNo chalans found in this record');
      }
      
      console.log('\n\n');
    });
    
  } catch (error) {
    console.error('Error fetching chalan data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Get student ID from command line arguments
const studentId = process.argv[2];

// If no student ID provided, show usage
if (!studentId) {
  console.error('Please provide a student ID as an argument');
  console.log('\nUsage: node scripts/viewChalanData.js <studentId>');
  console.log('Example: node scripts/viewChalanData.js 5f8d8f8f8f8f8f8f8f8f8f8a');
  console.log('\nTo find a student ID, you can check your database or use:');
  console.log('1. Check your frontend application');
  console.log('2. Use MongoDB Compass to browse the database');
  console.log('3. Run `mongo` in terminal and then:');
  console.log('   use erp');
  console.log('   db.users.find({ role: "student" }, { name: 1, _id: 1 })');
  process.exit(1);
}

// Validate student ID format
if (!mongoose.Types.ObjectId.isValid(studentId)) {
  console.error('❌ Error: Invalid student ID format');
  console.log('A valid MongoDB ObjectId should be a 24-character hexadecimal string');
  console.log('Example: 5f8d8f8f8f8f8f8f8f8f8f8a');
  process.exit(1);
}

console.log(`\n🔍 Looking up chalan data for student ID: ${studentId}`);

// Handle any unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('\n❌ Unhandled rejection:', err.message);
  if (err.message.includes('ECONNREFUSED')) {
    console.log('\n💡 Make sure MongoDB is running and accessible');
    console.log('Try running: mongod --dbpath="C:\\data\\db"');
  }
  process.exit(1);
});

// Call the main function
viewChalanData(studentId).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
