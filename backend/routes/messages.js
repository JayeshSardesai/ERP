const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Apply role check - only ADMIN and SUPER_ADMIN can access
router.use(roleCheck(['admin', 'superadmin']));

// Routes
router.post('/send', messagesController.sendMessage);
router.post('/preview', messagesController.previewMessage);
router.get('/', messagesController.getMessages);
router.get('/stats', messagesController.getMessageStats);
router.get('/:messageId', messagesController.getMessageDetails);

module.exports = router;
