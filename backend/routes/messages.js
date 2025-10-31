const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const checkPermission = require('../middleware/permissionCheck');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Apply permission check based on role
// Admin/Superadmin need messageStudentsParents permission to send/manage messages
// Students can view messages sent to them (no special permission needed)
router.use((req, res, next) => {
  // Students can only view messages, not send/delete
  if (req.user.role === 'student') {
    // Allow GET requests for students to view their messages
    if (req.method === 'GET') {
      return next();
    }
    // Block other operations for students
    return res.status(403).json({
      success: false,
      message: 'Students can only view messages'
    });
  }
  
  // For admin/superadmin, check role and permission
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only admin and superadmin can manage messages.'
    });
  }
  
  next();
});

// Apply permission check for admin/superadmin operations
router.use((req, res, next) => {
  if (req.user.role === 'student') {
    return next(); // Skip permission check for students (already handled above)
  }
  return checkPermission('messageStudentsParents')(req, res, next);
});

// Routes
router.post('/send', messagesController.sendMessage);
router.post('/preview', messagesController.previewMessage);
router.get('/', messagesController.getMessages);
router.get('/stats', messagesController.getMessageStats);
router.get('/:messageId', messagesController.getMessageDetails);
router.delete('/:messageId', messagesController.deleteMessage);
// router.route('/')
    // .post(messagesController.sendMessage);

module.exports = router;
