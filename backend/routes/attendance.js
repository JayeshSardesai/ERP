const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { auth, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/permissionCheck');

// Apply authentication middleware to all routes
router.use(auth);

// Attendance management routes - require markAttendance permission
router.post('/mark', authorize(['admin', 'teacher']), checkPermission('markAttendance'), attendanceController.markAttendance);
router.post('/mark-session', authorize(['admin', 'teacher']), checkPermission('markAttendance'), attendanceController.markSessionAttendance);
router.post('/mark-bulk', authorize(['admin', 'teacher']), checkPermission('markAttendance'), attendanceController.markBulkAttendance);

// View attendance routes - require viewAttendance permission
router.get('/', checkPermission('viewAttendance'), attendanceController.getAttendance);
router.get('/session-status', checkPermission('viewAttendance'), attendanceController.checkSessionStatus);
router.get('/class', checkPermission('viewAttendance'), attendanceController.getClassAttendance);
router.get('/stats', checkPermission('viewAttendance'), attendanceController.getAttendanceStats);
router.get('/student-report', checkPermission('viewAttendance'), attendanceController.getStudentAttendanceReport);

// Attendance-specific routes
router.patch('/:attendanceId/lock', authorize(['admin', 'teacher']), checkPermission('markAttendance'), attendanceController.lockAttendance);

module.exports = router;
