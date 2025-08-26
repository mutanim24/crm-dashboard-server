const express = require('express');
const { body } = require('express-validator');
const { prisma } = require('../services/db');

const router = express.Router();

/**
 * @route   GET /api/v1/workflows
 * @desc    Get all automation workflows for the authenticated user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const workflows = await prisma.automationWorkflow.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * @route   GET /api/v1/workflows/:id
 * @desc    Get a single workflow by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const workflow = await prisma.automationWorkflow.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * @route   POST /api/v1/workflows
 * @desc    Create a new automation workflow
 * @access  Private
 */
router.post(
  '/',
  [
    body('name')
      .notEmpty()
      .withMessage('Workflow name is required')
      .trim()
      .isLength({ max: 100 })
      .withMessage('Workflow name must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('trigger')
      .notEmpty()
      .withMessage('Trigger is required')
      .isObject()
      .withMessage('Trigger must be an object'),
    body('actions')
      .notEmpty()
      .withMessage('Actions are required')
      .isArray()
      .withMessage('Actions must be an array'),
  ],
  async (req, res) => {
    try {
      const { name, description, trigger, actions } = req.body;

      // Create workflow
      const workflow = await prisma.automationWorkflow.create({
        data: {
          name,
          description,
          trigger,
          actions,
          userId: req.user.id,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'workflow_created',
          note: `Created workflow: ${name}`,
          userId: req.user.id,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Workflow created successfully',
        data: workflow,
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  }
);

/**
 * @route   PUT /api/v1/workflows/:id
 * @desc    Update a workflow
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Workflow name must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('trigger')
      .optional()
      .isObject()
      .withMessage('Trigger must be an object'),
    body('actions')
      .optional()
      .isArray()
      .withMessage('Actions must be an array'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  async (req, res) => {
    try {
      const { name, description, trigger, actions, isActive } = req.body;

      // Check if workflow exists
      const existingWorkflow = await prisma.automationWorkflow.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!existingWorkflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Update workflow
      const updatedWorkflow = await prisma.automationWorkflow.update({
        where: { id: req.params.id },
        data: {
          name,
          description,
          trigger,
          actions,
          isActive,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'workflow_updated',
          note: `Updated workflow: ${name || updatedWorkflow.name}`,
          userId: req.user.id,
        },
      });

      res.json({
        success: true,
        message: 'Workflow updated successfully',
        data: updatedWorkflow,
      });
    } catch (error) {
      console.error('Error updating workflow:', error);
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  }
);

/**
 * @route   DELETE /api/v1/workflows/:id
 * @desc    Delete a workflow
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if workflow exists
    const existingWorkflow = await prisma.automationWorkflow.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Delete workflow
    await prisma.automationWorkflow.delete({
      where: { id: req.params.id },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'workflow_deleted',
        note: `Deleted workflow: ${existingWorkflow.name}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * @route   POST /api/v1/workflows/:id/execute
 * @desc    Manually execute a workflow
 * @access  Private
 */
router.post('/:id/execute', async (req, res) => {
  try {
    // Check if workflow exists
    const workflow = await prisma.automationWorkflow.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found or inactive' });
    }

    // Here you would implement the workflow execution logic
    // For now, we'll just log the execution attempt
    console.log(`Executing workflow: ${workflow.name}`);

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'workflow_executed',
        note: `Manually executed workflow: ${workflow.name}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: 'Workflow execution initiated',
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

module.exports = router;
