const express = require('express');
const router = express.Router();
const feesController = require('../controllers/feesController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const checkPermission = require('../middleware/permissionCheck');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Apply role check - only ADMIN and SUPER_ADMIN can access
router.use(roleCheck(['admin', 'superadmin']));

// Apply permission check - requires viewFees permission
router.use(checkPermission('viewFees'));

// Fee Structure routes
router.post('/structures', feesController.createFeeStructure);
router.get('/structures', feesController.getFeeStructures);

// Student Fee Records routes
router.get('/records', feesController.getStudentFeeRecords);
router.get('/records/:studentId', feesController.getStudentFeeRecord);
router.get('/stats', feesController.getFeeStats);

// Payment routes
router.post('/records/:studentId/offline-payment', feesController.recordOfflinePayment);
router.get('/receipts/:receiptNumber', feesController.downloadReceiptPdf);

// Export routes
router.get('/export', 
  authMiddleware.auth, // Ensure user is authenticated
  roleCheck(['admin', 'accountant', 'superadmin']), // Only allow admin, accountant, and superadmin
  async (req, res, next) => {
    console.log('🔵 Export route hit by user:', req.user._id);
    console.log('🔍 Request query:', JSON.stringify(req.query));
    console.log('🏫 School code:', req.user.schoolCode);
    
    try {
      // Call the controller and wait for it to complete
      await feesController.exportStudentFeeRecords(req, res);
    } catch (error) {
      console.error('❌ Error in export route:', {
        message: error.message,
        stack: error.stack,
        user: req.user ? {
          _id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          schoolCode: req.user.schoolCode
        } : 'No user in request',
        query: req.query
      });
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate export. Please try again.'
        });
      }
    }
  }
);

module.exports = router;
