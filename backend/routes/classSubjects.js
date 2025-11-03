const express = require('express');
const router = express.Router();
const classSubjectsController = require('../controllers/classSubjectsController');
const authMiddleware = require('../middleware/auth');
const { setSchoolContext } = require('../middleware/schoolContext');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Minimal logging for class-subjects routes
router.use((req, res, next) => {
  if (!req.originalUrl.includes('/classes')) {
    console.log('[CLASS-SUBJECTS]', req.method, req.originalUrl);
  }
  next();
});

// Apply school context middleware
router.use(setSchoolContext);

// Class-based Subject Management Routes

/**
 * Add Subject to Class
 * POST /api/class-subjects/add-subject
 * Body: { className, grade, section?, subjectName, subjectType?, teacherId?, teacherName? }
 */
router.post(
  '/add-subject',
  classSubjectsController.addSubjectToClass
);

/**
 * Remove Subject from Class
 * DELETE /api/class-subjects/remove-subject
 * Body: { className, subjectName }
 */
router.delete(
  '/remove-subject',
  classSubjectsController.removeSubjectFromClass
);

/**
 * Get All Classes with Subjects
 * GET /api/class-subjects/classes
 * Query: academicYear?
 */
router.get(
  '/classes',
  classSubjectsController.getAllClassesWithSubjects
);

/**
 * Get Subjects for a Specific Class
 * GET /api/class-subjects/class/:className
 * Query: academicYear?
 */
router.get(
  '/class/:className',
  classSubjectsController.getSubjectsForClass
);

/**
 * Get Subjects by Grade and Section
 * GET /api/class-subjects/grade/:grade/section/:section
 * Query: academicYear?
 */
router.get(
  '/grade/:grade/section/:section',
  classSubjectsController.getSubjectsByGradeSection
);

/**
 * Update Subject in Class
 * PUT /api/class-subjects/update-subject
 * Body: { className, subjectName, teacherId?, teacherName?, subjectType? }
 */
router.put(
  '/update-subject',
  classSubjectsController.updateSubjectInClass
);

/**
 * Bulk Add Subjects to Class
 * POST /api/class-subjects/bulk-add
 * Body: { className, grade, section?, subjects: [{ name, type? }] }
 */
router.post(
  '/bulk-add',
  classSubjectsController.bulkAddSubjectsToClass
);

module.exports = router;
