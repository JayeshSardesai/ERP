const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const leaveRequestController = require('../controllers/leaveRequestController');

// Teacher Routes
router.post(
  '/teacher/create',
  auth,
  authorize('teacher'),
  leaveRequestController.createLeaveRequest
);

router.get(
  '/teacher/my-requests',
  auth,
  authorize('teacher'),
  leaveRequestController.getTeacherLeaveRequests
);

router.delete(
  '/teacher/:id',
  auth,
  authorize('teacher'),
  leaveRequestController.deleteLeaveRequest
);

// Admin Routes
router.get(
  '/admin/all',
  auth,
  authorize('admin'),
  leaveRequestController.getSchoolLeaveRequests
);

router.get(
  '/admin/pending',
  auth,
  authorize('admin'),
  leaveRequestController.getPendingLeaveRequests
);

router.put(
  '/admin/:id/status',
  auth,
  authorize('admin'),
  leaveRequestController.updateLeaveRequestStatus
);

router.get(
  '/admin/stats',
  auth,
  authorize('admin'),
  leaveRequestController.getLeaveRequestStats
);

// Shared Routes (Teacher & Admin)
router.get(
  '/:id',
  auth,
  authorize('teacher', 'admin'),
  leaveRequestController.getLeaveRequestById
);

module.exports = router;
