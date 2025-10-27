const School = require('../models/School');
const DatabaseManager = require('../utils/databaseManager');

/**
 * Middleware to check if user has specific permission based on access matrix
 * @param {string} permission - The permission key to check (e.g., 'manageUsers', 'viewAttendance')
 * @returns {Function} - Express middleware function
 */
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Superadmin always has all permissions
      if (req.user && req.user.role === 'superadmin') {
        return next();
      }

      // Check if user exists and has required properties
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. User not authenticated or role not defined.'
        });
      }

      // Get school's access matrix
      let accessMatrix = null;
      
      // Try to get access matrix from school database if schoolCode is available
      if (req.user.schoolCode) {
        try {
          const schoolConn = await DatabaseManager.getSchoolConnection(req.user.schoolCode);
          const AccessMatrixModel = require('../models/AccessMatrix');
          const SchoolAccessMatrix = AccessMatrixModel.getModelForConnection(schoolConn);
          
          const matrixDoc = await SchoolAccessMatrix.findOne({ schoolCode: req.user.schoolCode });
          if (matrixDoc && matrixDoc.accessMatrix) {
            accessMatrix = matrixDoc.accessMatrix;
          }
        } catch (error) {
          console.log('[PERMISSION CHECK] Could not fetch from school database:', error.message);
        }
      }

      // Fallback to main database if not found in school database
      if (!accessMatrix && req.user.schoolId) {
        try {
          const school = await School.findById(req.user.schoolId);
          if (school && school.accessMatrix) {
            accessMatrix = school.accessMatrix;
          }
        } catch (error) {
          console.log('[PERMISSION CHECK] Could not fetch from main database:', error.message);
        }
      }

      // If no access matrix found, use default permissions based on role
      if (!accessMatrix) {
        console.log('[PERMISSION CHECK] No access matrix found, using default permissions');
        const defaultPermissions = getDefaultPermissions(req.user.role);
        
        if (!defaultPermissions[permission]) {
          return res.status(403).json({
            success: false,
            message: `Access denied. You do not have permission to ${permission}.`
          });
        }
        
        return next();
      }

      // Check if user's role has the required permission
      const rolePermissions = accessMatrix[req.user.role];
      
      if (!rolePermissions || !rolePermissions[permission]) {
        console.log(`[PERMISSION CHECK] Access denied: ${req.user.role} does not have ${permission} permission`);
        return res.status(403).json({
          success: false,
          message: `Access denied. Your role (${req.user.role}) does not have permission to ${permission}.`
        });
      }

      console.log(`[PERMISSION CHECK] Access granted: ${req.user.role} has ${permission} permission`);
      next();
    } catch (error) {
      console.error('[PERMISSION CHECK ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Error checking permissions',
        error: error.message
      });
    }
  };
};

/**
 * Get default permissions for a role when no access matrix is configured
 */
function getDefaultPermissions(role) {
  const defaultMatrix = {
    superadmin: {
      manageUsers: true,
      manageSchoolSettings: true,
      viewAttendance: true,
      viewResults: true,
      messageStudentsParents: true,
      viewAcademicDetails: true,
      viewAssignments: true,
      viewFees: true,
      viewReports: true,
      createTimetable: true,
      viewTimetable: true,
      markAttendance: true,
      addAssignments: true,
      updateResults: true
    },
    admin: {
      manageUsers: true,
      manageSchoolSettings: true,
      viewAttendance: true,
      viewResults: true,
      messageStudentsParents: true,
      viewAcademicDetails: true,
      viewAssignments: true,
      viewFees: true,
      viewReports: true,
      createTimetable: true,
      viewTimetable: true,
      markAttendance: true,
      addAssignments: true,
      updateResults: true
    },
    teacher: {
      manageUsers: false,
      manageSchoolSettings: false,
      viewAttendance: true,
      viewResults: true,
      messageStudentsParents: true,
      viewAcademicDetails: true,
      viewAssignments: true,
      viewFees: false,
      viewReports: false,
      createTimetable: true,
      viewTimetable: true,
      markAttendance: true,
      addAssignments: true,
      updateResults: true
    },
    student: {
      manageUsers: false,
      manageSchoolSettings: false,
      viewAttendance: false,
      viewResults: true,
      messageStudentsParents: false,
      viewAcademicDetails: false,
      viewAssignments: true,
      viewFees: false,
      viewReports: false,
      createTimetable: false,
      viewTimetable: true,
      markAttendance: false,
      addAssignments: false,
      updateResults: false
    },
    parent: {
      manageUsers: false,
      manageSchoolSettings: false,
      viewAttendance: false,
      viewResults: false,
      messageStudentsParents: false,
      viewAcademicDetails: false,
      viewAssignments: false,
      viewFees: false,
      viewReports: false,
      createTimetable: false,
      viewTimetable: false,
      markAttendance: false,
      addAssignments: false,
      updateResults: false
    }
  };

  return defaultMatrix[role] || {};
}

module.exports = checkPermission;
