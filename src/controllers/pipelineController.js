const { prisma } = require('../services/db');

/**
 * Get all pipelines for the authenticated user with fully nested stages and deals
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllPipelines = async (req, res) => {
  try {
    const pipelines = await prisma.pipeline.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        stages: {
          orderBy: {
            order: 'asc',
          },
          include: {
            deals: {
              orderBy: {
                createdAt: 'asc',
              },
              include: {
                contact: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pipelines,
    });
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
};

/**
 * Get a single pipeline by ID with all related data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPipelineById = async (req, res) => {
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
        _count: {
          select: {
            deals: true,
          },
        },
      },
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    res.json({
      success: true,
      data: pipeline,
    });
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
};

/**
 * Get all deals for a specific pipeline
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPipelineDeals = async (req, res) => {
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
};

/**
 * Create a new pipeline
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createPipeline = async (req, res) => {
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
                order: index,
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
};

/**
 * Update an existing pipeline
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePipeline = async (req, res) => {
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
};

/**
 * Delete a pipeline
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deletePipeline = async (req, res) => {
  try {
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
        note: `Deleted pipeline: ${pipeline.name}`,
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
};

module.exports = {
  getAllPipelines,
  getPipelineById,
  getPipelineDeals,
  createPipeline,
  updatePipeline,
  deletePipeline,
};
