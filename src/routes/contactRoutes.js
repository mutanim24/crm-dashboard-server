const express = require('express');
const { body } = require('express-validator');
const contactController = require('../controllers/contactController');

const router = express.Router();

/**
 * @route   GET /api/v1/contacts
 * @desc    List Contacts with pagination, search, and filtering
 * @access  Private
 */
router.get('/', contactController.getContacts);

/**
 * @route   GET /api/v1/contacts/:id
 * @desc    Get Single Contact with all related data
 * @access  Private
 */
router.get('/:id', contactController.getContactById);

/**
 * @route   POST /api/v1/contacts
 * @desc    Create Contact
 * @access  Private
 */
router.post(
  '/',
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('First name must be less than 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Last name must be less than 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    body('company')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Company name must be less than 100 characters'),
  ],
  contactController.createContact
);

/**
 * @route   PUT /api/v1/contacts/:id
 * @desc    Update Contact
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('First name must be less than 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Last name must be less than 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    body('company')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Company name must be less than 100 characters'),
  ],
  contactController.updateContact
);

/**
 * @route   DELETE /api/v1/contacts/:id
 * @desc    Delete Contact
 * @access  Private
 */
router.delete('/:id', contactController.deleteContact);

/**
 * @route   POST /api/v1/contacts/:id/tags
 * @desc    Assign Tag to Contact
 * @access  Private
 */
router.post(
  '/:id/tags',
  [
    body('tagId')
      .notEmpty()
      .withMessage('Tag ID is required')
      .isString()
      .withMessage('Tag ID must be a string'),
  ],
  contactController.assignTagToContact
);

/**
 * @route   DELETE /api/v1/contacts/:id/tags/:tagId
 * @desc    Remove Tag from Contact
 * @access  Private
 */
router.delete('/:id/tags/:tagId', contactController.removeTagFromContact);

module.exports = router;
