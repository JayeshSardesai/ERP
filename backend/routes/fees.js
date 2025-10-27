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

module.exports = router;
