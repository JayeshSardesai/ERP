const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  updateStudents();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function updateStudents() {
  try {
    const db = mongoose.connection.db;
    
    // Find all active students in Class 1, Section A
    const students = await db.collection('students').find({
      'studentDetails.currentClass': '1',
      'studentDetails.currentSection': 'A',
      isActive: true
    }).toArray();

    console.log(`Found ${students.length} students in Class 1, Section A`);
    
    if (students.length === 0) {
      console.log('No students found. Here are some sample students:');
      const sampleStudents = await db.collection('students').find({}).limit(3).toArray();
      console.log(sampleStudents);
      return;
    }

    // Get the class document
    const classDoc = await db.collection('classes').findOne({
      className: '1',
      'sections.name': 'A'
    });

    if (!classDoc) {
      console.error('Class 1, Section A not found');
      const classes = await db.collection('classes').find({}).toArray();
      console.log('Available classes:');
      console.log(classes.map(c => ({
        _id: c._id,
        className: c.className,
        sections: c.sections
      })));
      return;
    }

    // Prepare student updates
    const studentUpdates = students.map(student => ({
      studentId: student._id,
      studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'Unknown',
      rollNumber: student.rollNumber || `STU-${student._id.toString().substring(0, 6)}`,
      isActive: true
    }));

    // Update the class
    const result = await db.collection('classes').updateOne(
      { _id: classDoc._id },
      { 
        $set: { 
          students: studentUpdates,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Successfully updated Class 1, Section A with ${studentUpdates.length} students`);
      
      // Show a sample of the update
      const updatedClass = await db.collection('classes').findOne({ _id: classDoc._id });
      console.log('\nUpdated class info:');
      console.log({
        className: updatedClass.className,
        section: updatedClass.sections.find(s => s.name === 'A')?.name || 'N/A',
        totalStudents: updatedClass.students?.length || 0,
        sampleStudents: updatedClass.students?.slice(0, 3) || []
      });
    } else {
      console.log('\n⚠️ No changes were made. The students array might already be up to date.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}
