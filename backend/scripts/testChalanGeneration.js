require('dotenv').config();
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const School = require('../models/School');
const User = require('../models/User');

async function testChalanGeneration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get a test school and student
    const school = await School.findOne();
    if (!school) {
      throw new Error('No schools found in the database');
    }

    const student = await User.findOne({ role: 'student' });
    if (!student) {
      throw new Error('No students found in the database');
    }

    console.log(`Using school: ${school.name} (${school._id})`);
    console.log(`Using student: ${student.name} (${student._id})`);

    // Generate test chalan data
    const testData = {
      studentIds: [student._id],
      amount: 1000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      class: student.class || '10',
      section: student.section || 'A',
      installmentName: 'Test Chalan Generation'
    };

    console.log('\nGenerating test chalan with data:', JSON.stringify(testData, null, 2));

    // Call the chalan generation API
    const response = await fetch(`http://localhost:5000/api/chalans/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN' // Replace with a valid admin token
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Chalan generated successfully!');
      console.log('Generated chalan:', JSON.stringify(result, null, 2));
      
      // Verify the chalan number format
      if (result.chalanNumber && !result.chalanNumber.includes('TEMP')) {
        console.log('✅ Chalan number format is correct');
      } else {
        console.error('❌ Chalan number still contains TEMP!');
      }
    } else {
      console.error('❌ Failed to generate chalan:', result);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the test
testChalanGeneration();
