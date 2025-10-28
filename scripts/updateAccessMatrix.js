const mongoose = require('mongoose');
const School = require('../backend/models/School');

async function updateAccessMatrix() {
  try {
    // Connect to main database
    const MONGODB_URI = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to main database');

    // Find all schools
    const schools = await School.find({});
    console.log(`📊 Found ${schools.length} schools`);

    for (const school of schools) {
      console.log(`\n🏫 Processing school: ${school.name} (${school.code})`);
      
      // Check if markAttendance permission exists
      const adminHasMarkAttendance = school.accessMatrix?.admin?.markAttendance !== undefined;
      
      if (!adminHasMarkAttendance) {
        console.log('⚠️  markAttendance permission missing, adding it...');
        
        // Add markAttendance permission to all roles
        if (!school.accessMatrix) {
          school.accessMatrix = {};
        }
        
        if (!school.accessMatrix.admin) {
          school.accessMatrix.admin = {};
        }
        school.accessMatrix.admin.markAttendance = true;
        
        if (!school.accessMatrix.teacher) {
          school.accessMatrix.teacher = {};
        }
        school.accessMatrix.teacher.markAttendance = true;
        
        if (!school.accessMatrix.student) {
          school.accessMatrix.student = {};
        }
        school.accessMatrix.student.markAttendance = false;
        
        if (!school.accessMatrix.parent) {
          school.accessMatrix.parent = {};
        }
        school.accessMatrix.parent.markAttendance = false;
        
        // Save the updated school
        await school.save();
        console.log('✅ markAttendance permission added and saved');
        
        // Also update the school's dedicated database if it exists
        if (school.databaseCreated && school.code) {
          try {
            const SchoolDatabaseManager = require('../backend/utils/schoolDatabaseManager');
            const schoolConn = await SchoolDatabaseManager.getSchoolConnection(school.code);
            
            // Update access_matrices collection
            const accessMatrixCollection = schoolConn.collection('access_matrices');
            await accessMatrixCollection.updateOne(
              { schoolCode: school.code },
              {
                $set: {
                  accessMatrix: school.accessMatrix,
                  updatedAt: new Date()
                }
              },
              { upsert: true }
            );
            
            console.log(`✅ Access matrix synced to school database: ${school.databaseName}`);
          } catch (syncError) {
            console.error('❌ Error syncing to school database:', syncError.message);
          }
        }
      } else {
        console.log('✅ markAttendance permission already exists');
      }
    }

    console.log('\n✅ All schools updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating access matrix:', error);
    process.exit(1);
  }
}

updateAccessMatrix();
