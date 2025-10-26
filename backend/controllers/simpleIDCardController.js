const idCardGenerator = require('../utils/simpleIDCardGenerator');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

/**
 * Simple ID Card Generation Controller
 * No database templates - uses PNG files directly from idcard-templates folder
 */

// Generate ID cards for selected students
const generateIDCards = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { 
      studentIds, 
      orientation = 'landscape',
      includeBack = true 
    } = req.body;

    console.log('🎯 ID Card Generation Request:', {
      schoolId,
      studentIds,
      studentCount: studentIds?.length,
      orientation,
      includeBack,
      body: req.body,
      user: req.user
    });

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      console.error('❌ Invalid or missing studentIds:', { studentIds, type: typeof studentIds });
      return res.status(400).json({
        success: false,
        message: 'No students selected or invalid student IDs format',
        debug: {
          received: studentIds,
          type: typeof studentIds,
          isArray: Array.isArray(studentIds)
        }
      });
    }

    // Use UserGenerator to fetch students from school-specific database (same as hall tickets)
    const UserGenerator = require('../utils/userGenerator');
    const mongoose = require('mongoose');
    const { ObjectId } = require('mongodb');
    
    // Get schoolCode from user context
    const schoolCode = req.user.schoolCode;
    
    console.log('🔍 Fetching students using UserGenerator (same as hall tickets):', {
      schoolCode,
      studentIds,
      schoolId
    });
    
    // Validate that studentIds are valid MongoDB ObjectIDs
    const validStudentIds = studentIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const invalidStudentIds = studentIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    
    if (invalidStudentIds.length > 0) {
      console.warn('⚠️ Invalid MongoDB ObjectIDs detected:', {
        invalidIds: invalidStudentIds,
        validIds: validStudentIds,
        totalRequested: studentIds.length
      });
    }
    
    if (validStudentIds.length === 0) {
      console.error('❌ No valid MongoDB ObjectIDs found:', {
        requestedIds: studentIds,
        allInvalid: true
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid student IDs. Please ensure students are loaded from the database, not mock data.',
        debug: {
          requestedIds: studentIds,
          invalidIds: invalidStudentIds,
          hint: 'Student IDs must be valid MongoDB ObjectIDs. Mock data IDs like "1", "2", "3" are not valid.'
        }
      });
    }
    
    // Get all students from school database using UserGenerator (same as getUsersByRole)
    const allStudents = await UserGenerator.getUsersByRole(schoolCode, 'student');
    
    console.log('📚 All students from school database:', {
      totalStudents: allStudents.length,
      requestedIds: validStudentIds
    });
    
    // Filter to only the requested students
    const students = allStudents.filter(student => 
      validStudentIds.includes(student._id.toString())
    );

    console.log('📚 Students found in database (with filters):', {
      requestedCount: studentIds.length,
      foundCount: students.length,
      students: students.map(s => ({
        id: s._id,
        name: s.name?.displayName || `${s.name?.firstName} ${s.name?.lastName}`,
        userId: s.userId
      }))
    });

    if (students.length === 0) {
      console.error('❌ No students found matching the requested IDs');
      return res.status(400).json({
        success: false,
        message: 'No students found in database',
        debug: {
          requestedIds: validStudentIds,
          invalidIds: invalidStudentIds,
          schoolCode,
          totalStudentsInSchool: allStudents.length,
          hint: invalidStudentIds.length > 0 
            ? 'Some student IDs are invalid. Make sure students are loaded from the database, not mock data.'
            : 'Students not found in database. Check if the students exist and belong to this school.'
        }
      });
    }

    // Map student data to expected format (matching UserGenerator schema)
    const mappedStudents = students.map(s => ({
      _id: s._id,
      name: s.name?.displayName || `${s.name?.firstName || ''} ${s.name?.lastName || ''}`.trim(),
      sequenceId: s.userId || s.studentId,
      rollNumber: s.academicInfo?.rollNumber || s.rollNumber,
      className: s.academicInfo?.currentClass || s.currentClass || s.class,
      section: s.academicInfo?.currentSection || s.currentSection || s.section,
      dateOfBirth: s.personalInfo?.dateOfBirth || s.dateOfBirth || s.dob,
      bloodGroup: s.personalInfo?.bloodGroup || s.bloodGroup,
      profileImage: s.profileImage
    }));

    // Get school info
    const School = require('../models/School');
    const school = await School.findById(schoolId).select('name address');

    console.log('🏫 School info:', {
      schoolId,
      schoolName: school?.name,
      hasAddress: !!school?.address
    });

    console.log('👥 Mapped students for generation:', {
      count: mappedStudents.length,
      students: mappedStudents.map(s => ({
        id: s._id,
        name: s.name,
        class: s.className,
        section: s.section,
        hasPhoto: !!s.profileImage
      }))
    });

    // Generate ID cards
    const results = await idCardGenerator.generateBulkIDCards(
      mappedStudents,
      orientation,
      includeBack,
      {
        schoolName: school?.name || '',
        address: school?.address || ''
      }
    );

    console.log('✅ Generation results:', {
      successCount: results.success.length,
      failedCount: results.failed.length,
      failed: results.failed
    });

    res.json({
      success: true,
      message: `Generated ${results.success.length} ID cards successfully`,
      data: {
        generated: results.success,
        failed: results.failed,
        totalRequested: studentIds.length,
        totalGenerated: results.success.length,
        totalFailed: results.failed.length
      }
    });
  } catch (error) {
    console.error('❌ Error generating ID cards:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error generating ID cards',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Download ID cards as ZIP
const downloadIDCards = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { studentIds, orientation = 'landscape', includeBack = true } = req.body;

    console.log('📥 Download ID Cards Request:', {
      schoolId,
      studentIds,
      studentCount: studentIds?.length,
      orientation,
      includeBack,
      body: req.body
    });

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      console.error('❌ Invalid or missing studentIds for download:', { studentIds });
      return res.status(400).json({
        success: false,
        message: 'No students selected or invalid student IDs format'
      });
    }

    // Use UserGenerator to fetch students from school-specific database (same as generate)
    const UserGenerator = require('../utils/userGenerator');
    const mongoose = require('mongoose');
    const schoolCode = req.user.schoolCode;
    
    // Validate that studentIds are valid MongoDB ObjectIDs
    const validStudentIds = studentIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const invalidStudentIds = studentIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    
    if (invalidStudentIds.length > 0) {
      console.warn('⚠️ Invalid MongoDB ObjectIDs detected for download:', {
        invalidIds: invalidStudentIds,
        validIds: validStudentIds
      });
    }
    
    if (validStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student IDs. Please ensure students are loaded from the database, not mock data.',
        debug: {
          requestedIds: studentIds,
          invalidIds: invalidStudentIds
        }
      });
    }
    
    // Get all students from school database using UserGenerator
    const allStudents = await UserGenerator.getUsersByRole(schoolCode, 'student');
    
    // Filter to only the requested students
    const students = allStudents.filter(student => 
      validStudentIds.includes(student._id.toString())
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found in database',
        debug: {
          requestedIds: validStudentIds,
          invalidIds: invalidStudentIds,
          schoolCode,
          totalStudentsInSchool: allStudents.length,
          hint: invalidStudentIds.length > 0 
            ? 'Some student IDs are invalid. Make sure students are loaded from the database, not mock data.'
            : 'Students not found in database.'
        }
      });
    }

    console.log(`📥 Download: Found ${students.length} students`);

    // Map student data to expected format (matching UserGenerator schema)
    const mappedStudents = students.map(s => ({
      _id: s._id,
      name: s.name?.displayName || `${s.name?.firstName || ''} ${s.name?.lastName || ''}`.trim(),
      sequenceId: s.userId || s.studentId,
      rollNumber: s.academicInfo?.rollNumber || s.rollNumber,
      className: s.academicInfo?.currentClass || s.currentClass || s.class,
      section: s.academicInfo?.currentSection || s.currentSection || s.section,
      dateOfBirth: s.personalInfo?.dateOfBirth || s.dateOfBirth || s.dob,
      bloodGroup: s.personalInfo?.bloodGroup || s.bloodGroup,
      profileImage: s.profileImage
    }));

    // Get school info
    const School = require('../models/School');
    const school = await School.findById(schoolId).select('name address');

    console.log('🏫 School info for download:', {
      schoolId,
      schoolName: school?.name,
      hasAddress: !!school?.address
    });

    console.log('👥 Mapped students for download:', {
      count: mappedStudents.length,
      students: mappedStudents.map(s => ({
        id: s._id,
        name: s.name,
        class: s.className,
        section: s.section
      }))
    });

    // Generate ID cards
    const results = await idCardGenerator.generateBulkIDCards(
      mappedStudents,
      orientation,
      includeBack,
      {
        schoolName: school?.name || '',
        address: school?.address || ''
      }
    );

    console.log('✅ Download generation results:', {
      successCount: results.success.length,
      failedCount: results.failed.length,
      failed: results.failed
    });

    if (results.success.length === 0) {
      console.error('❌ No ID cards generated successfully');
      return res.status(500).json({
        success: false,
        message: 'Failed to generate any ID cards',
        failed: results.failed
      });
    }

    // Create ZIP file
    const schoolName = school?.name || 'School';
    const zipFileName = `IDCards_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.zip`;
    
    console.log('📦 Creating ZIP file:', zipFileName);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Handle errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({
        success: false,
        message: 'Error creating ZIP file',
        error: err.message
      });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add generated ID cards to ZIP
    let filesAdded = 0;
    for (const result of results.success) {
      if (result.frontCard) {
        const frontPath = path.join(__dirname, '..', result.frontCard);
        if (fs.existsSync(frontPath)) {
          archive.file(frontPath, { name: path.basename(frontPath) });
          filesAdded++;
          console.log('📄 Added front card:', path.basename(frontPath));
        } else {
          console.warn('⚠️ Front card file not found:', frontPath);
        }
      }
      if (result.backCard) {
        const backPath = path.join(__dirname, '..', result.backCard);
        if (fs.existsSync(backPath)) {
          archive.file(backPath, { name: path.basename(backPath) });
          filesAdded++;
          console.log('📄 Added back card:', path.basename(backPath));
        } else {
          console.warn('⚠️ Back card file not found:', backPath);
        }
      }
    }

    console.log(`📦 Total files added to ZIP: ${filesAdded}`);

    // Finalize archive
    await archive.finalize();
    console.log('✅ ZIP file finalized and sent');
  } catch (error) {
    console.error('❌ Error downloading ID cards:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error downloading ID cards',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};

// Preview single ID card
const previewIDCard = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { studentId, orientation = 'landscape', side = 'front' } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    // Fetch student from User model
    const User = require('../models/User');
    let student = await User.findOne({
      _id: studentId,
      schoolId,
      role: 'student'
    }).select('name userId studentDetails profileImage');

    // If not found with schoolId, try without it
    if (!student) {
      console.warn('⚠️ Student not found with schoolId filter, trying without...');
      student = await User.findOne({
        _id: studentId,
        role: 'student'
      }).select('name userId studentDetails profileImage');
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Map student data to expected format
    const mappedStudent = {
      _id: student._id,
      name: student.name?.displayName || `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
      sequenceId: student.userId || student.studentDetails?.studentId,
      rollNumber: student.studentDetails?.rollNumber,
      className: student.studentDetails?.academic?.currentClass,
      section: student.studentDetails?.academic?.currentSection,
      dateOfBirth: student.studentDetails?.personal?.dateOfBirth,
      bloodGroup: student.studentDetails?.personal?.bloodGroup,
      profileImage: student.profileImage
    };

    // Get school info
    const School = require('../models/School');
    const school = await School.findById(schoolId).select('name address');

    // Generate preview
    const result = await idCardGenerator.generateIDCard(
      mappedStudent,
      orientation,
      side,
      {
        schoolName: school?.name || '',
        address: school?.address || ''
      }
    );

    // Send preview image
    const imagePath = path.join(__dirname, '..', result.relativePath);
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating preview',
      error: error.message
    });
  }
};

module.exports = {
  generateIDCards,
  downloadIDCards,
  previewIDCard
};
