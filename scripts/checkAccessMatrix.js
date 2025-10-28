const { MongoClient } = require('mongodb');

async function checkAccessMatrix() {
  const uri = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('institute_erp');
    const schools = db.collection('schools');

    // Find KVS school
    const kvsSchool = await schools.findOne({ code: 'KVS' });
    
    if (kvsSchool) {
      console.log('\n🏫 KVS School found');
      console.log('📋 Access Matrix:');
      console.log(JSON.stringify(kvsSchool.accessMatrix, null, 2));
      
      // Check if markAttendance exists
      if (kvsSchool.accessMatrix?.admin?.markAttendance !== undefined) {
        console.log('\n✅ markAttendance permission exists for admin');
      } else {
        console.log('\n⚠️  markAttendance permission MISSING for admin');
        console.log('🔧 Updating access matrix...');
        
        // Update the access matrix
        const updateResult = await schools.updateOne(
          { code: 'KVS' },
          {
            $set: {
              'accessMatrix.admin.markAttendance': true,
              'accessMatrix.teacher.markAttendance': true,
              'accessMatrix.student.markAttendance': false,
              'accessMatrix.parent.markAttendance': false
            }
          }
        );
        
        console.log('✅ Update result:', updateResult);
        
        // Verify the update
        const updatedSchool = await schools.findOne({ code: 'KVS' });
        console.log('\n📋 Updated Access Matrix:');
        console.log(JSON.stringify(updatedSchool.accessMatrix, null, 2));
      }
      
      // Also update the school-specific database
      if (kvsSchool.databaseName) {
        console.log(`\n🔄 Updating school-specific database: ${kvsSchool.databaseName}`);
        const schoolDb = client.db(kvsSchool.databaseName);
        const accessMatrices = schoolDb.collection('access_matrices');
        
        const matrixDoc = await accessMatrices.findOne({ schoolCode: 'KVS' });
        if (matrixDoc) {
          console.log('📋 Current school DB access matrix:', JSON.stringify(matrixDoc.accessMatrix, null, 2));
        }
        
        // Update or insert the access matrix
        const updatedSchool = await schools.findOne({ code: 'KVS' });
        await accessMatrices.updateOne(
          { schoolCode: 'KVS' },
          {
            $set: {
              accessMatrix: updatedSchool.accessMatrix,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
        
        console.log('✅ School-specific database updated');
      }
    } else {
      console.log('❌ KVS School not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

checkAccessMatrix();
