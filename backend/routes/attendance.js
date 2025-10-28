const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { auth, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/permissionCheck');

// Apply authentication middleware to all routes
router.use(auth);

// Attendance routes - all require viewAttendance permission (simplified)
// If user can view attendance, they can also mark it (for admin/teacher roles)
router.post('/mark', authorize(['admin', 'teacher']), checkPermission('viewAttendance'), attendanceController.markAttendance);
router.post('/mark-session', authorize(['admin', 'teacher']), checkPermission('viewAttendance'), attendanceController.markSessionAttendance);
router.post('/mark-bulk', authorize(['admin', 'teacher']), checkPermission('viewAttendance'), attendanceController.markBulkAttendance);
router.patch('/:attendanceId/lock', authorize(['admin', 'teacher']), checkPermission('viewAttendance'), attendanceController.lockAttendance);

// View attendance routes
router.get('/', checkPermission('viewAttendance'), attendanceController.getAttendance);
router.get('/session-status', checkPermission('viewAttendance'), attendanceController.checkSessionStatus);
router.get('/session-data', checkPermission('viewAttendance'), attendanceController.getSessionAttendanceData);
router.get('/class', checkPermission('viewAttendance'), attendanceController.getClassAttendance);
router.get('/stats', checkPermission('viewAttendance'), attendanceController.getAttendanceStats);
router.get('/overall-rate', checkPermission('viewAttendance'), attendanceController.getOverallAttendanceRate);
router.get('/daily-stats', checkPermission('viewAttendance'), attendanceController.getDailyAttendanceStats);
router.get('/student-report', checkPermission('viewAttendance'), attendanceController.getStudentAttendanceReport);

module.exports = router;
