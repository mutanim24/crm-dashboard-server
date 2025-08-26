const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Create a new email template
router.post('/', templateController.createTemplate);

// Get all email templates for the authenticated user
router.get('/', templateController.getTemplates);

// Get a single email template by ID
router.get('/:id', templateController.getTemplateById);

// Update an email template by ID
router.put('/:id', templateController.updateTemplate);

// Delete an email template by ID
router.delete('/:id', templateController.deleteTemplate);

module.exports = router;
