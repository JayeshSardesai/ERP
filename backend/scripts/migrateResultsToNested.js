/**
 * Migration Script: Convert Flat Results to Nested Structure
 * 
 * OLD (Flat) Structure:
 * {
 *   schoolCode, className, section, studentId, studentName, userId,
 *   testType, subject, maxMarks, obtainedMarks, totalMarks, grade, percentage
 * }
 * 
 * NEW (Nested) Structure:
 * {
 *   schoolCode, className, section, studentId, studentName, userId, academicYear,
 *   subjects: [
 *     { subjectName, testType, maxMarks, obtainedMarks, totalMarks, grade, percentage }
 *   ]
 * }
 */

const DatabaseManager = require('../utils/databaseManager');

async function migrateResultsToNested(schoolCode) {
  try {
    console.log(`\n🔄 Starting migration for school: ${schoolCode}`);
    
    // Get school database connection
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');
    
    // Find all flat structure documents (documents with testType at root level but no subjects array)
    const flatResults = await resultsCollection.find({
      testType: { $exists: true },
      subjects: { $exists: false }
    }).toArray();
    
    console.log(`📊 Found ${flatResults.length} flat structure documents to migrate`);
    
    if (flatResults.length === 0) {
      console.log('✅ No documents to migrate. All results are already in nested format.');
      return { success: true, migrated: 0, message: 'No migration needed' };
    }
    
    // Group flat results by student
    const studentGroups = new Map();
    
    for (const doc of flatResults) {
      const key = `${doc.studentId}_${doc.className}_${doc.section}_${doc.academicYear || '2024-25'}`;
      
      if (!studentGroups.has(key)) {
        studentGroups.set(key, {
          studentId: doc.studentId,
          studentName: doc.studentName,
          userId: doc.userId,
          className: doc.className,
          section: doc.section,
          academicYear: doc.academicYear || '2024-25',
          schoolCode: doc.schoolCode,
          createdAt: doc.createdAt,
          createdBy: doc.createdBy,
          subjects: [],
          oldDocIds: []
        });
      }
      
      const group = studentGroups.get(key);
      
      // Add subject entry
      group.subjects.push({
        subjectName: doc.subject || 'Unknown',
        testType: doc.testType,
        maxMarks: doc.maxMarks,
        obtainedMarks: doc.obtainedMarks,
        totalMarks: doc.totalMarks,
        grade: doc.grade,
        percentage: doc.percentage,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      });
      
      // Track old document IDs for deletion
      group.oldDocIds.push(doc._id);
    }
    
    console.log(`👥 Grouped into ${studentGroups.size} student documents`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    // Create new nested documents and delete old flat ones
    for (const [key, group] of studentGroups) {
      try {
        // Insert new nested document
        const newDoc = {
          schoolCode: group.schoolCode,
          className: group.className,
          section: group.section,
          academicYear: group.academicYear,
          studentId: group.studentId,
          studentName: group.studentName,
          userId: group.userId,
          subjects: group.subjects,
          createdAt: group.createdAt,
          updatedAt: new Date(),
          createdBy: group.createdBy,
          migratedAt: new Date(),
          migrationNote: 'Migrated from flat structure'
        };
        
        await resultsCollection.insertOne(newDoc);
        
        // Delete old flat documents
        await resultsCollection.deleteMany({
          _id: { $in: group.oldDocIds }
        });
        
        migratedCount++;
        console.log(`✅ Migrated ${group.subjects.length} subjects for student: ${group.studentName} (${group.userId})`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating student ${group.studentName}:`, error.message);
      }
    }
    
    console.log(`\n✅ Migration completed!`);
    console.log(`   - Students migrated: ${migratedCount}`);
    console.log(`   - Total subjects migrated: ${flatResults.length}`);
    console.log(`   - Errors: ${errorCount}`);
    
    return {
      success: true,
      migratedStudents: migratedCount,
      totalSubjects: flatResults.length,
      errors: errorCount
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const schoolCode = process.argv[2];
  
  if (!schoolCode) {
    console.error('❌ Please provide school code as argument');
    console.log('Usage: node migrateResultsToNested.js <SCHOOL_CODE>');
    process.exit(1);
  }
  
  // Connect to MongoDB first
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return migrateResultsToNested(schoolCode);
    })
    .then((result) => {
      console.log('\n🎉 Migration successful:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateResultsToNested };
