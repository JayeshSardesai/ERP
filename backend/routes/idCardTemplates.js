const express = require('express');
const router = express.Router();
const {
  uploadTemplate,
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate
} = require('../controllers/idCardTemplateController');
const {
  generateIDCards,
  downloadIDCards,
  previewIDCard
} = require('../controllers/simpleIDCardController');
const { auth } = require('../middleware/auth');
const { setSchoolContext } = require('../middleware/schoolContext');

// Apply authentication and school context middleware
router.use(auth);
router.use(setSchoolContext);

// ID Card Generation Routes (Simple - using PNG templates directly)
router.post('/generate', generateIDCards);
router.post('/download', downloadIDCards);
router.get('/preview', previewIDCard);

// Get all templates for the school
router.get('/', getTemplates);

// Get a specific template
router.get('/:templateId', getTemplate);

// Create a new template
router.post('/', uploadTemplate, createTemplate);

// Update a template
router.put('/:templateId', updateTemplate);

// Delete a template (soft delete)
router.delete('/:templateId', deleteTemplate);

// Set default template
router.post('/:templateId/set-default', setDefaultTemplate);

module.exports = router;
