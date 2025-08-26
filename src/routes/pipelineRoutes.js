const express = require('express');
const { body } = require('express-validator');
const pipelineController = require('../controllers/pipelineController');

const router = express.Router();

/**
 * @route   GET /api/v1/pipelines
 * @desc    List All Pipelines with fully nested stages and deals
 * @access  Private
 */
router.get('/', pipelineController.getAllPipelines);

/**
 * @route   GET /api/v1/pipelines/:id
 * @desc    Get Single Pipeline with all related data
 * @access  Private
 */
router.get('/:id', pipelineController.getPipelineById);

/**
 * @route   GET /api/v1/pipelines/:id/deals
 * @desc    List Deals in a Pipeline
 * @access  Private
 */
router.get('/:id/deals', pipelineController.getPipelineDeals);

/**
 * @route   POST /api/v1/pipelines
 * @desc    Create a new Pipeline
 * @access  Private
 */
router.post(
  '/',
  [
    body('name')
      .notEmpty()
      .withMessage('Pipeline name is required')
      .isLength({ max: 100 })
      .withMessage('Pipeline name must be less than 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
  ],
  pipelineController.createPipeline
);

/**
 * @route   PUT /api/v1/pipelines/:id
 * @desc    Update an existing Pipeline
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('name')
      .optional()
      .notEmpty()
      .withMessage('Pipeline name is required')
      .isLength({ max: 100 })
      .withMessage('Pipeline name must be less than 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
  ],
  pipelineController.updatePipeline
);

/**
 * @route   DELETE /api/v1/pipelines/:id
 * @desc    Delete a Pipeline
 * @access  Private
 */
router.delete('/:id', pipelineController.deletePipeline);

module.exports = router;
