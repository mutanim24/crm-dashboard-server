const express = require('express');
const { body } = require('express-validator');
const { prisma } = require('../services/db');

const router = express.Router();

/**
 * @route   GET /api/v1/pipelines
 * @desc    Get all pipelines for the authenticated user
 * @access  Private
 */
router.get('/', require('../controllers/pipelineController').getAllPipelines);

/**
 * @route   GET /api/v1/pipelines/:id/stages
 * @desc    Get all stages for a specific pipeline
 * @access  Private
 */
router.get('/:id/stages', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        stages: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    res.json({
      success: true,
      data: pipeline.stages,
    });
  } catch (error) {
    console.error('Error fetching pipeline stages:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline stages' });
  }
});

/**
 * @route   GET /api/v1/pipelines/:id/deals
 * @desc    Get all deals for a specific pipeline
 * @access  Private
 */
router.get('/:id/deals', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      stageId,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const skip = (page - 1) * limit;

    // Check if pipeline exists
    const pipeline = await prisma.pipeline.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Build where clause
    const where = {
      pipelineId: req.params.id,
      userId: req.user.id,
    };

    if (stageId) {
      where.stageId = stageId;
    }

    // Get deals
    const deals = await prisma.deal.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        stage: true,
        pipeline: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Only get recent activities
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.deal.count({ where });

    res.json({
      success: true,
      data: deals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching pipeline deals:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline deals' });
  }
});

/**
 * @route   POST /api/v1/pipelines
 * @desc    Create a new pipeline
 * @access  Private
 */
router.post(
  '/',
  [
    body('name')
      .notEmpty()
      .withMessage('Pipeline name is required')
      .trim()
      .isLength({ max: 100 })
      .withMessage('Pipeline name must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('stages')
      .optional()
      .isArray()
      .withMessage('Stages must be an array'),
    body('stages.*.name')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Stage name must be less than 50 characters'),
    body('stages.*.order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stage order must be a positive integer'),
  ],
  async (req, res) => {
    try {
      const { name, description, stages } = req.body;

      // Create pipeline
      const pipeline = await prisma.pipeline.create({
        data: {
          name,
          description,
          userId: req.user.id,
          stages: stages
            ? {
                create: stages.map((stage, index) => ({
                  name: stage.name,
                  order: stage.order || index + 1,
                })),
              }
            : undefined,
        },
        include: {
          stages: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'pipeline_created',
          note: `Created pipeline: ${name}`,
          userId: req.user.id,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Pipeline created successfully',
        data: pipeline,
      });
    } catch (error) {
      console.error('Error creating pipeline:', error);
      res.status(500).json({ error: 'Failed to create pipeline' });
    }
  }
);

/**
 * @route   PUT /api/v1/pipelines/:id
 * @desc    Update a pipeline
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Pipeline name must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
  ],
  async (req, res) => {
    try {
      const { name, description } = req.body;

      // Check if pipeline exists
      const existingPipeline = await prisma.pipeline.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!existingPipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      // Update pipeline
      const updatedPipeline = await prisma.pipeline.update({
        where: { id: req.params.id },
        data: {
          name,
          description,
        },
        include: {
          stages: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'pipeline_updated',
          note: `Updated pipeline: ${name || updatedPipeline.name}`,
          userId: req.user.id,
        },
      });

      res.json({
        success: true,
        message: 'Pipeline updated successfully',
        data: updatedPipeline,
      });
    } catch (error) {
      console.error('Error updating pipeline:', error);
      res.status(500).json({ error: 'Failed to update pipeline' });
    }
  }
);

/**
 * @route   DELETE /api/v1/pipelines/:id
 * @desc    Delete a pipeline
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if pipeline exists
    const existingPipeline = await prisma.pipeline.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existingPipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Check if pipeline has deals
    const dealCount = await prisma.deal.count({
      where: {
        pipelineId: req.params.id,
      },
    });

    if (dealCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete pipeline with associated deals. Please move or delete the deals first.' 
      });
    }

    // Delete pipeline
    await prisma.pipeline.delete({
      where: { id: req.params.id },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'pipeline_deleted',
        note: `Deleted pipeline: ${existingPipeline.name}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: 'Pipeline deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting pipeline:', error);
    res.status(500).json({ error: 'Failed to delete pipeline' });
  }
});

module.exports = router;
