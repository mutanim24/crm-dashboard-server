const express = require('express');
const { body } = require('express-validator');
const dealController = require('../controllers/dealController');

const router = express.Router();

/**
 * @route   GET /api/v1/deals
 * @desc    Get all deals for the authenticated user
 * @access  Private
 */
router.get('/', dealController.getDeals);

/**
 * @route   GET /api/v1/deals/:id
 * @desc    Get a single deal by ID
 * @access  Private
 */
router.get('/:id', dealController.getDealById);

/**
 * @route   POST /api/v1/deals
 * @desc    Create a new deal
 * @access  Private
 */
router.post(
  '/',
  [
    body('title')
      .notEmpty()
      .withMessage('Deal title is required')
      .trim()
      .isLength({ max: 200 })
      .withMessage('Deal title must be less than 200 characters'),
    body('value')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Deal value must be a positive number'),
    body('currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a 3-letter code (e.g., USD)'),
    body('pipelineId')
      .notEmpty()
      .withMessage('Pipeline ID is required')
      .isString()
      .withMessage('Pipeline ID must be a string'),
    body('stageId')
      .notEmpty()
      .withMessage('Stage ID is required')
      .isString()
      .withMessage('Stage ID must be a string'),
    body('contactId')
      .optional()
      .isString()
      .withMessage('Contact ID must be a string'),
    body('data')
      .optional()
      .isObject()
      .withMessage('Data must be an object'),
  ],
  dealController.createDeal
);

/**
 * @route   PUT /api/v1/deals/:id
 * @desc    Update a deal (specifically for stage changes from drag-and-drop)
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('stageId')
      .notEmpty()
      .withMessage('Stage ID is required')
      .isString()
      .withMessage('Stage ID must be a string'),
  ],
  dealController.updateDeal
);

/**
 * @route   PUT /api/v1/deals/:id/stage
 * @desc    Update Deal Stage
 * @access  Private
 */
router.put(
  '/:id/stage',
  [
    body('stageId')
      .notEmpty()
      .withMessage('Stage ID is required')
      .isString()
      .withMessage('Stage ID must be a string'),
  ],
  dealController.updateDealStage
);

/**
 * @route   DELETE /api/v1/deals/:id
 * @desc    Delete Deal
 * @access  Private
 */
router.delete('/:id', dealController.deleteDeal);

module.exports = router;
