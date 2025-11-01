const express = require('express');
const router = express.Router();
const chalanController = require('../controllers/chalanController');
const { protect } = require('../middleware/authMiddleware');

// Get next chalan number
router.get('/next-chalan-number', protect, chalanController.getNextChalanNumber);

// Development/Admin routes
router.get('/debug/student/:studentId', protect, chalanController.getStudentChalanData);

// Standard routes
router.post('/generate', protect, chalanController.generateChalans);
router.get('/', protect, chalanController.getChalans);
router.get('/:id', protect, chalanController.getChalanById);
router.get('/student/:studentId', protect, chalanController.getChalansByStudent);
router.post('/:id/pay', protect, chalanController.markAsPaid);

module.exports = router;
