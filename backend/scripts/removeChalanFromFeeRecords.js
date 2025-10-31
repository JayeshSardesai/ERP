const mongoose = require('mongoose');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
const School = require('../models/School');

async function removeChalanFromFeeRecords() {
  try {
    // Connect to the main database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to main database');

    // Get all schools
    const schools = await School.find({}).select('_id code').lean();
    console.log(`Found ${schools.length} schools`);

    for (const school of schools) {
      try {
        console.log(`\nProcessing school: ${school.code} (${school._id})`);
        
        // Get school database connection
        const conn = await SchoolDatabaseManager.getSchoolConnection(school.code);
        const db = conn.db || conn;
        
        // Get the student fee records collection
        const studentFeeCol = db.collection('studentfeerecords');
        
        // Find and update all fee records to remove chalan-related fields from payments
        const result = await studentFeeCol.updateMany(
          {},
          {
            $unset: {
              'payments.$[].chalanId': "",
              'payments.$[].chalanNumber': "",
            }
          }
        );
        
        console.log(`✅ Updated ${result.modifiedCount} fee records for school ${school.code}`);
        
      } catch (schoolError) {
        console.error(`❌ Error processing school ${school.code}:`, schoolError);
        // Continue with the next school even if one fails
        continue;
      }
    }

    console.log('\n✅ Migration completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
removeChalanFromFeeRecords();
