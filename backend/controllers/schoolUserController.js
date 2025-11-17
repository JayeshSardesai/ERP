const UserGenerator = require('../utils/userGenerator');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
const Timetable = require('../models/Timetable');
const School = require('../models/School');
const { ObjectId } = require('mongodb');

// Helper function to resolve school identifier (name or code) to school code
const resolveSchoolCode = async (schoolIdentifier) => {
  console.log(`🔍 Resolving school identifier: ${schoolIdentifier}`);

  // First, try to find school by code (direct match)
  let school = await School.findOne({ code: schoolIdentifier.toUpperCase() });

  if (!school) {
    // If not found by code, try to find by name
    school = await School.findOne({ name: { $regex: new RegExp(`^${schoolIdentifier}$`, 'i') } });
  }

  if (!school) {
    // If no school record exists but we're working with a simple identifier,
    // assume it's a valid school code if it matches expected pattern
    console.log(`⚠️ School record not found for ${schoolIdentifier}, treating as direct school code`);
    return schoolIdentifier.toLowerCase();
  }

  console.log(`✅ Resolved to school: ${school.name} (code: ${school.code})`);
  return school.code.toLowerCase();
};

// Add a new user to a school
exports.addUserToSchool = async (req, res) => {
  try {
    const { schoolCode: schoolIdentifier } = req.params;
    const userData = req.body;

    // Resolve school name or code to actual school code
    const schoolCode = await resolveSchoolCode(schoolIdentifier);

    // Validate required fields
    if (!userData.email || !userData.role || !userData.firstName) {
      return res.status(400).json({
        success: false,
        message: 'Email, role, and first name are required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'teacher', 'student', 'parent'];
    if (!validRoles.includes(userData.role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, teacher, student, or parent'
      });
    }

    // Check if user already exists
    const existingUser = await UserGenerator.getUserByIdOrEmail(schoolCode, userData.email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Add creator information
    userData.createdBy = req.user._id;

    // Create user
    const result = await UserGenerator.createUser(schoolCode, userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result
    });

  } catch (error) {
    console.error('Error adding user to school:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// Get all users from a school by role
exports.getUsersByRole = async (req, res) => {
  try {
    const { schoolCode: schoolIdentifier, role } = req.params;

    // Resolve school name or code to actual school code
    const schoolCode = await resolveSchoolCode(schoolIdentifier);

    const users = await UserGenerator.getUsersByRole(schoolCode, role);

    res.json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error) {
    console.error('Error getting users by role:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Get all users from a school (all roles)
exports.getAllSchoolUsers = async (req, res) => {
  try {
    const { schoolCode: schoolIdentifier } = req.params;

    console.log(`🔍 Fetching all users for school identifier: ${schoolIdentifier}`);

    // Resolve school name or code to actual school code
    const schoolCode = await resolveSchoolCode(schoolIdentifier);

    const roles = ['admin', 'teacher', 'student', 'parent'];
    const allUsers = [];
    const breakdown = {};

    for (const role of roles) {
      try {
        const users = await UserGenerator.getUsersByRole(schoolCode, role);
        // Ensure each user has the correct role field
        const usersWithRole = users.map(user => ({
          ...user,
          role: role // Ensure role is explicitly set
        }));
        allUsers.push(...usersWithRole);
        breakdown[role] = users.length;
        console.log(`✅ Found ${users.length} ${role}s in ${role}s collection`);
      } catch (error) {
        console.error(`❌ Error getting ${role}s:`, error);
        breakdown[role] = 0;
      }
    }

    const totalCount = allUsers.length;

    console.log(`📊 Total users found: ${totalCount}`, {
      breakdown: breakdown
    });

    res.json({
      success: true,
      data: allUsers, // Now returning flat array instead of nested object
      totalCount,
      breakdown: breakdown
    });

  } catch (error) {
    console.error('Error getting all school users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { schoolCode, userId } = req.params;

    const user = await UserGenerator.getUserByIdOrEmail(schoolCode, userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// Update user information
exports.updateUser = async (req, res) => {
  try {
    const { schoolCode, userId } = req.params;

    // --- START: MODIFIED LOGIC FOR IMAGE UPLOAD ---
    let updateData;

    // Check if the request is multipart/form-data (contains a file)
    if (req.is('multipart/form-data')) {
      console.log('Received multipart/form-data request (with image)');

      // If it is, the user data is in the 'userData' field as a JSON string
      if (!req.body.userData) {
        return res.status(400).json({
          success: false,
          message: "Missing 'userData' field in multipart request"
        });
      }

      try {
        // Parse the JSON string to get the user data object
        updateData = JSON.parse(req.body.userData);
      } catch (e) {
        console.error("Invalid 'userData' JSON string:", e);
        return res.status(400).json({
          success: false,
          message: "Invalid 'userData' JSON string"
        });
      }

      // Check if a file was uploaded by multer
      if (req.file) {
        console.log(`📸 File uploaded, path: ${req.file.path}`);
        // Add the image URL (e.g., from Cloudinary) to the update data
        // The field name 'profileImage' must match your User model schema
        updateData.profileImage = req.file.path;
      }
    } else {
      // No file, just a normal JSON request
      console.log('Received application/json request (no image)');
      updateData = req.body;
    }
    // --- END: MODIFIED LOGIC FOR IMAGE UPLOAD ---

    // This line is now replaced by the logic above
    // const updateData = req.body; 

    const result = await UserGenerator.updateUser(schoolCode, userId, updateData);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// Reset user password
exports.resetUserPassword = async (req, res) => {
  try {
    const { schoolCode, userId } = req.params;

    const result = await UserGenerator.resetUserPassword(schoolCode, userId);

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: result.credentials
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

// Change user password (admin sets new password)
exports.changeUserPassword = async (req, res) => {
  try {
    const { schoolCode, userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Password cannot be empty'
      });
    }

    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const collections = ['admins', 'teachers', 'students', 'parents'];

    // Hash the new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let updated = false;
    let userEmail = '';
    let userRole = '';

    for (const collectionName of collections) {
      const collection = connection.collection(collectionName);

      // Build query to handle both ObjectId and custom userId formats
      let query = { userId: userId };

      // If userId looks like a MongoDB ObjectId, also try _id field
      if (userId.match(/^[0-9a-fA-F]{24}$/)) {
        query = {
          $or: [
            { _id: new ObjectId(userId) },
            { userId: userId }
          ]
        };
      }

      console.log(`🔍 Searching for user in ${collectionName} with query:`, JSON.stringify(query));

      // First, find the user to check if they exist
      const existingUser = await collection.findOne(query);

      if (existingUser) {
        console.log(`✅ Found user in ${collectionName}:`, existingUser.userId || existingUser._id);

        // Update the password
        const updateResult = await collection.updateOne(
          query,
          {
            $set: {
              password: hashedPassword,
              temporaryPassword: newPassword, // Store for admin reference
              updatedAt: new Date()
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          updated = true;
          userEmail = existingUser.email;
          userRole = existingUser.role;
          console.log(`✅ Changed password for user: ${userId} in ${collectionName}`);
          break;
        }
      }
    }

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        userId,
        email: userEmail,
        role: userRole
      }
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      section: section.toUpperCase(),
      status: { $in: ['active', 'draft'] }
    });

    if (!timetable) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: timetable
    });

  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching timetable',
      error: error.message
    });
  }
};

// Create or update timetable
exports.createTimetable = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const { class: className, section, slots, schoolCode: timetableSchoolCode } = req.body;

    // Validate required fields
    if (!className || !section || !slots) {
      return res.status(400).json({
        success: false,
        message: 'Class, section, and slots are required'
      });
    }

    // Find existing timetable or create new one
    let timetable = await Timetable.findOne({
      schoolCode,
      class: className,
      section: section.toUpperCase()
    });

    if (timetable) {
      // Update existing timetable
      timetable.weeklySchedule = slots
        .filter(slot => slot.subject && slot.subject.trim() !== '') // Only include slots with subjects
        .map(slot => ({
          dayOfWeek: slot.day,
          periods: [{
            periodNumber: 1,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectCode: slot.subject,
            subjectName: slot.subject,
            teacherId: slot.teacherId && slot.teacherId.trim() !== '' ? slot.teacherId : null,
            teacherName: slot.teacher || 'Not Assigned',
            classroom: {
              roomNumber: slot.room || 'TBD'
            },
            periodType: 'regular',
            isBreak: false
          }]
        }));
      timetable.updatedAt = new Date();
      await timetable.save();
    } else {
      // Create new timetable
      const validSlots = slots.filter(slot => slot.subject && slot.subject.trim() !== ''); // Filter out empty subjects

      if (validSlots.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one subject must be assigned to create a timetable'
        });
      }

      const newTimetable = new Timetable({
        timetableId: `${schoolCode}_TT_${new Date().getFullYear()}_${className}${section.toUpperCase()}_${Date.now().toString().slice(-3)}`,
        schoolId: req.user._id || req.user.schoolId,
        schoolCode,
        academicYear: `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`,
        class: className,
        section: section.toUpperCase(),
        classSection: `${className}${section.toUpperCase()}`,
        effectiveFrom: new Date(),
        status: 'draft',
        createdBy: req.user._id,
        weeklySchedule: validSlots.map(slot => ({
          dayOfWeek: slot.day,
          periods: [{
            periodNumber: 1,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectCode: slot.subject,
            subjectName: slot.subject,
            teacherId: slot.teacherId && slot.teacherId.trim() !== '' ? slot.teacherId : null,
            teacherName: slot.teacher || 'Not Assigned',
            classroom: {
              roomNumber: slot.room || 'TBD'
            },
            periodType: 'regular',
            isBreak: false
          }]
        }))
      });
      timetable = await newTimetable.save();
    }

    res.status(201).json({
      success: true,
      message: 'Timetable saved successfully',
      data: timetable
    });

  } catch (error) {
    console.error('Error creating timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating timetable',
      error: error.message
    });
  }
};

// Update timetable
exports.updateTimetable = async (req, res) => {
  try {
    const { schoolCode, className, section } = req.params;
    const { slots } = req.body;

    const timetable = await Timetable.findOne({
      schoolCode,
      class: className,
      section: section.toUpperCase()
    });

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    // Update the timetable
    timetable.weeklySchedule = slots
      .filter(slot => slot.subject && slot.subject.trim() !== '') // Only include slots with subjects
      .map(slot => ({
        dayOfWeek: slot.day,
        periods: [{
          periodNumber: 1,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectCode: slot.subject,
          subjectName: slot.subject,
          teacherId: slot.teacherId && slot.teacherId.trim() !== '' ? slot.teacherId : null,
          teacherName: slot.teacher || 'Not Assigned',
          classroom: {
            roomNumber: slot.room || 'TBD'
          },
          periodType: 'regular',
          isBreak: false
        }]
      }));
    timetable.updatedAt = new Date();

    await timetable.save();

    res.json({
      success: true,
      message: 'Timetable updated successfully',
      data: timetable
    });

  } catch (error) {
    console.error('Error updating timetable:', error);
    res.status(500).json({
      success: false,
      s: 2,
      message: 'Error updating timetable',
      error: error.message
    });
  }
};

// Delete timetable
exports.deleteTimetable = async (req, res) => {
  try {
    const { schoolCode, className, section } = req.params;

    const result = await Timetable.findOneAndDelete({
      schoolCode,
      class: className,
      section: section.toUpperCase()
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.json({
      success: true,
      message: 'Timetable deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting timetable',
      error: error.message
    });
  }
};

// Verify admin password and get teacher password(s)
exports.verifyAdminAndGetPasswords = async (req, res) => {
  try {
    const { schoolCode: schoolIdentifier } = req.params;
    const { adminPassword, teacherUserId } = req.body;

    // Resolve school name or code to actual school code
    const schoolCode = await resolveSchoolCode(schoolIdentifier);

    // Validate request
    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Admin password is required'
      });
    }

    // Get the admin user from request (set by auth middleware)
    const adminUser = req.user;

    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view teacher passwords'
      });
    }

    // Fetch admin user with password from database (req.user doesn't include password)
    const adminWithPassword = await UserGenerator.getUserByIdOrEmail(schoolCode, adminUser.userId || adminUser.email, true);

    if (!adminWithPassword || !adminWithPassword.password) {
      console.error('Admin user fetch failed:', {
        found: !!adminWithPassword,
        hasPassword: !!adminWithPassword?.password,
        userId: adminUser.userId,
        email: adminUser.email
      });
      return res.status(500).json({
        success: false,
        message: 'Admin user not found or password not available'
      });
    }

    // Verify admin password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(adminPassword, adminWithPassword.password);
    G
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin password'
      });
    }

    // If teacherUserId is provided, get single teacher password
    if (teacherUserId) {
      const teacher = await UserGenerator.getUserByIdOrEmail(schoolCode, teacherUserId);

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      if (teacher.role !== 'teacher') {
        return res.status(400).json({
          s: 2,
          success: false,
          message: 'User is not a teacher'
        });
      }

      return res.json({
        success: true,
        data: {
          userId: teacher.userId,
          email: teacher.email,
          name: teacher.name?.displayName || `${teacher.name?.firstName} ${teacher.name?.lastName}`,
          temporaryPassword: teacher.temporaryPassword || null
        }
      });
    }

    // Otherwise, get all teacher passwords
    const teachers = await UserGenerator.getUsersByRole(schoolCode, 'teacher');

    const teacherPasswords = teachers.map(teacher => ({
      userId: teacher.userId,
      email: teacher.email,
      name: teacher.name?.displayName || `${teacher.name?.firstName} ${teacher.name?.lastName}`,
      temporaryPassword: teacher.temporaryPassword || null
    }));

    return res.json({
      success: true,
      data: teacherPasswords,
      count: teacherPasswords.length
    });

  } catch (error) {
    console.error('Error verifying admin and getting passwords:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving passwords',
      error: error.message
    });
  }
};

module.exports = exports;