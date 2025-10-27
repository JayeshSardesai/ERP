const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const resultController = require('../controllers/resultController');

// Create or update student result
router.post('/create', 
  authMiddleware.auth, 
  resultController.createOrUpdateResult
);

// Save results (simple endpoint for Results page)
router.post('/save', 
  authMiddleware.auth, 
  resultController.saveResults
);

// Get existing results for a class and section
router.get('/', 
  authMiddleware.auth, 
  resultController.getResults
);

// Update a single student result
router.put('/:resultId', 
  authMiddleware.auth, 
  resultController.updateResult
);

// Freeze results for a class/section/subject/test
router.post('/freeze', 
  authMiddleware.auth, 
  resultController.freezeResults
);

// Get student result history
router.get('/student/:studentId/history', 
  authMiddleware.auth, 
  resultController.getStudentResultHistory
);

// Generate class performance report
router.get('/class/:grade/:section/report', 
  authMiddleware.auth, 
  resultController.generateClassPerformanceReport
);

module.exports = router;
