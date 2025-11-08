const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const schoolController = require('../controllers/schoolController');
const exportImportController = require('../controllers/exportImportController');
const authMiddleware = require('../middleware/auth');
const { setSchoolContext, validateSchoolAccess, requireSuperAdmin, setMainDbContext } = require('../middleware/schoolContext');

// Ensure temp directory exists
const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for school image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'temp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'school-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (before compression)
  },
  fileFilter: (req, file, cb) => {
    console.log('📎 File upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Check mimetype
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      console.log('✅ File type accepted:', file.mimetype);
      return cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      return cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

// Upload config for logos - store in temp for compression
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-temp-${unique}${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (before compression)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

// Upload config for other files (Excel imports, etc.)
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `upload-${unique}${ext}`);
  }
});
const fileUpload = multer({ storage: fileStorage });

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Super Admin routes (work with main database)
router.post('/', setMainDbContext, requireSuperAdmin, logoUpload.single('logo'), async (req, res) => {
  try {
    console.log('Creating school with data:', req.body);
    console.log('Uploaded file:', req.file);
    await schoolController.createSchool(req, res);
  } catch (error) {
    console.error('Error in POST /schools route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});
router.get('/', setMainDbContext, requireSuperAdmin, schoolController.getAllSchools);
router.get('/stats', setMainDbContext, requireSuperAdmin, schoolController.getSchoolStats);
router.get('/all-stats', setMainDbContext, requireSuperAdmin, schoolController.getAllSchoolsStats);

// School data sync routes (Super Admin only)
router.post('/sync/all', setMainDbContext, requireSuperAdmin, schoolController.syncAllSchoolsToDatabase);
router.post('/:schoolId/sync', setMainDbContext, requireSuperAdmin, schoolController.syncSchoolToDatabase);

// School-specific routes (require school context)
router.get('/:schoolId', setSchoolContext, validateSchoolAccess(['admin', 'superadmin']), schoolController.getSchoolById);

// Direct school info route (bypasses school-specific database issues)
router.get('/:schoolId/info', authMiddleware.auth, schoolController.getSchoolInfo);
// Get school info from school_info collection in school's database
// router.get('/database/school-info', authMiddleware.auth, schoolController.getSchoolInfoFromDatabase); // Commented out - function removed
router.put('/:schoolId',
  authMiddleware.auth,
  setMainDbContext,
  upload.single('schoolImage'), // Handle single file upload with field name 'schoolImage'
  schoolController.updateSchool
);
router.patch('/:schoolId/access-matrix', setMainDbContext, requireSuperAdmin, schoolController.updateAccessMatrix);
router.delete('/:schoolId', setMainDbContext, requireSuperAdmin, schoolController.deleteSchool);
// Update only bank details
router.patch('/:schoolId/bank-details', schoolController.updateBankDetails);
router.patch('/:schoolId/toggle-status', schoolController.toggleSchoolStatus);

// Classes and sections endpoint (canonical data)
router.get('/:schoolId/classes', schoolController.getClassesForSchool);

// User management routes
router.get('/:schoolId/users', schoolController.getSchoolUsers);
router.post('/:schoolId/users', schoolController.addUser);
router.post('/:schoolId/admins', schoolController.addAdminToSchool);
router.post('/:schoolId/users/import', fileUpload.single('file'), schoolController.importUsers);
router.get('/:schoolId/users/export', schoolController.exportUsers);

// Comprehensive export/import routes
router.get('/:schoolCode/export/users', exportImportController.exportUsers);
router.post('/:schoolCode/import/users', fileUpload.single('file'), exportImportController.importUsers);
router.get('/:schoolCode/template/:role', exportImportController.generateTemplate);
router.put('/:schoolId/users/:userId', schoolController.updateUser);
router.delete('/:schoolId/users/:userId', schoolController.deleteUser);
router.patch('/:schoolId/users/:userId/status', schoolController.toggleUserStatus);
router.patch('/:schoolId/users/:userId/password', schoolController.updateUserPassword);

// Bulk user operations
router.post('/:schoolId/users/bulk/delete', schoolController.bulkDeleteUsers);
router.patch('/:schoolId/users/bulk/status', schoolController.bulkToggleUserStatus);

module.exports = router;
