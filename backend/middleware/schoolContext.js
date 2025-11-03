const School = require('../models/School');
const DatabaseManager = require('../utils/databaseManager');

/**
 * Middleware to set school context for multi-tenant operations
 * This middleware ensures that users can only access data from their assigned school
 */
const setSchoolContext = async (req, res, next) => {
  try {
    let schoolId = null;
    let schoolCode = null;
    
    // --- START OF FIX: Case-insensitive header check ---
    // Helper function to get a header case-insensitively
    const getHeader = (name) => req.headers[name.toLowerCase()] || req.headers[name.toUpperCase()] || req.headers[name];
    
    // Try to get school identifier from multiple sources
    const headerSchoolId = getHeader('x-school-id');
    const headerSchoolCode = getHeader('x-school-code');
    // --- END OF FIX ---

    if (headerSchoolId) {
      schoolId = headerSchoolId;
    } else if (headerSchoolCode) {
      schoolCode = headerSchoolCode;
    } else if (req.body.schoolId) {
      schoolId = req.body.schoolId;
    } else if (req.body.schoolCode) {
      schoolCode = req.body.schoolCode;
    } else if (req.params.schoolId) {
      schoolId = req.params.schoolId;
    } else if (req.params.schoolCode) {
      schoolCode = req.params.schoolCode;
    } else if (req.user && req.user.schoolId && req.user.role !== 'superadmin') {
      // Get from authenticated user (except superadmin)
      schoolId = req.user.schoolId;
      schoolCode = req.user.schoolCode;
    }
    
    // For superadmin, school context is optional for some operations
    // but when provided, it should be validated and set
    if (req.user && req.user.role === 'superadmin') {
      if (!schoolId && !schoolCode) {
        // For super admin routes that don't require specific school context
        // (like listing all schools), we can proceed without school context
        console.log('🔧 Super admin operation without specific school context');
        return next();
      }
    } else if (!schoolId && !schoolCode) {
      // For non-superadmin users, school context is always required
      return res.status(400).json({
        success: false,
        message: 'School identifier is required. Please provide schoolId or schoolCode in headers or request body.'
      });
    }
    
    // Find school by ID or code
    let school;
    if (schoolId) {
      school = await School.findById(schoolId);
    } else if (schoolCode) {
      school = await School.findOne({ code: new RegExp(`^${schoolCode}$`, 'i') });
    }
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }
    
    // Verify user has access to this school (except for superadmin)
    if (req.user && req.user.role !== 'superadmin') {
      if (req.user.schoolId && req.user.schoolId.toString() !== school._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to access this school data'
        });
      }
    }
    
    // Set school context
    req.school = school;
    req.schoolCode = school.code;
    req.schoolId = school._id;
    
    // Get school database connection
    try {
      req.schoolDb = await DatabaseManager.getSchoolConnection(school.code);
      console.log(`📍 School context set: ${school.name} (${school.code}) for ${req.user.role}`);
    } catch (error) {
      console.error(`Error getting school database connection:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error accessing school database'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in school context middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting school context',
      error: error.message
    });
  }
};

/**
 * Middleware to validate school access for specific roles
 */
const validateSchoolAccess = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Skip validation for superadmin
      if (req.user && req.user.role === 'superadmin') {
        return next();
      }
      
      // Check if user role is allowed
      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: ${req.user.role} role is not authorized for this operation`
        });
      }
      
      // Ensure school context is set
      if (!req.school || !req.schoolDb) {
        return res.status(400).json({
          success: false,
          message: 'School context not properly set'
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error validating school access',
        error: error.message
      });
    }
  };
};

/**
 * Middleware specifically for superadmin operations
 */
const requireSuperAdmin = (req, res, next) => {
  try {
    console.log('🔐 requireSuperAdmin middleware called');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.originalUrl);
    console.log('Request user:', req.user);
    
    if (!req.user || req.user.role !== 'superadmin') {
      console.error('Authorization failed: User is not a superadmin');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Superadmin access required'
      });
    }
    console.log('Superadmin access granted for user:', req.user);
    next();
  } catch (error) {
    console.error('Error in requireSuperAdmin middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating superadmin access',
      error: error.message
    });
  }
};

/**
 * Middleware for operations that require main database context
 */
const setMainDbContext = (req, res, next) => {
  try {
    console.log('[setMainDbContext] Initializing main database context');
    req.mainDb = DatabaseManager.getMainConnection();
    console.log('[setMainDbContext] Main database context set successfully');
    next();
  } catch (error) {
    console.error('[setMainDbContext ERROR] Failed to set main database context:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting main database context',
      error: error.message
    });
  }
};

/**
 * Middleware for operations that require school context (stricter version)
 */
const requireSchoolContext = async (req, res, next) => {
  try {
    let schoolId = null;
    let schoolCode = null;
    
    // Helper function to get a header case-insensitively (same as setSchoolContext)
    const getHeader = (name) => req.headers[name.toLowerCase()] || req.headers[name.toUpperCase()] || req.headers[name];
    
    // Try to get school identifier from multiple sources
    const headerSchoolId = getHeader('x-school-id');
    const headerSchoolCode = getHeader('x-school-code');

    if (headerSchoolId) {
      schoolId = headerSchoolId;
    } else if (headerSchoolCode) {
      schoolCode = headerSchoolCode;
    } else if (req.body.schoolId) {
      schoolId = req.body.schoolId;
    } else if (req.body.schoolCode) {
      schoolCode = req.body.schoolCode;
    } else if (req.params.schoolId) {
      schoolId = req.params.schoolId;
    } else if (req.params.schoolCode) {
      schoolCode = req.params.schoolCode;
    } else if (req.user && req.user.schoolId && req.user.role !== 'superadmin') {
      // Get from authenticated user (except superadmin)
      schoolId = req.user.schoolId;
      schoolCode = req.user.schoolCode;
    }
    
    // School context is always required for this middleware
    if (!schoolId && !schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School identifier is required. Please provide schoolId or schoolCode in headers (x-school-id or x-school-code) or request body.',
        hint: 'For super admin: Add "x-school-code: SCHOOL_CODE" to your request headers'
      });
    }
    
    // Find school by ID or code
    let school;
    if (schoolId) {
      school = await School.findById(schoolId);
    } else if (schoolCode) {
      school = await School.findOne({ code: new RegExp(`^${schoolCode}$`, 'i') });
    }
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: `School not found with ${schoolId ? 'ID' : 'code'}: ${schoolId || schoolCode}`
      });
    }
    
    // Verify user has access to this school (except for superadmin)
    if (req.user && req.user.role !== 'superadmin') {
      if (req.user.schoolId && req.user.schoolId.toString() !== school._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to access this school data'
        });
      }
    }
    
    // Set school context
    req.school = school;
    req.schoolCode = school.code;
    req.schoolId = school._id;
    
    // Get school database connection
    try {
      req.schoolDb = await DatabaseManager.getSchoolConnection(school.code);
      console.log(`📍 School context required and set: ${school.name} (${school.code}) for ${req.user.role}`);
    } catch (error) {
      console.error(`Error getting school database connection:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error accessing school database'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in require school context middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting school context',
      error: error.message
    });
  }
};

module.exports = {
  setSchoolContext,
  requireSchoolContext,
  validateSchoolAccess,
  requireSuperAdmin,
  setMainDbContext
};
