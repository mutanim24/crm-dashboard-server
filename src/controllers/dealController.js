const { prisma } = require('../services/db');

/**
 * Get all deals for the authenticated user with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeals = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      pipelineId,
      stageId,
      contactId,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      userId: req.user.id,
    };

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    if (stageId) {
      where.stageId = stageId;
    }

    if (contactId) {
      where.contactId = contactId;
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
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
};

/**
 * Get a single deal by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDealById = async (req, res) => {
  try {
    const deal = await prisma.deal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
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
            company: true,
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
        },
      },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({
      success: true,
      data: deal,
    });
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
};

/**
 * Create a new deal
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createDeal = async (req, res) => {
  try {
    const { title, value, currency, pipelineId, stageId, contactId, data } = req.body;

    // Check if pipeline exists
    const pipeline = await prisma.pipeline.findFirst({
      where: {
        id: pipelineId,
        userId: req.user.id,
      },
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Check if stage exists in the pipeline
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        pipelineId,
      },
    });

    if (!stage) {
      return res.status(404).json({ error: 'Stage not found in the specified pipeline' });
    }

    // If contactId is provided, check if contact exists
    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId: req.user.id,
        },
      });

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }
    }

    // Create deal
    const deal = await prisma.deal.create({
      data: {
        title,
        value,
        currency,
        pipelineId,
        stageId,
        contactId,
        data,
        userId: req.user.id,
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
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'deal_created',
        note: `Created deal: ${title}`,
        userId: req.user.id,
        dealId: deal.id,
        contactId: deal.contactId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      data: deal,
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
};

/**
 * Update a deal (specifically for stage changes from drag-and-drop)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateDeal = async (req, res) => {
  try {
    const { stageId } = req.body;

    // Check if deal exists and belongs to the authenticated user
    const deal = await prisma.deal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if stage exists
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
      },
    });

    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    // Update deal stage
    const updatedDeal = await prisma.deal.update({
      where: { id: req.params.id },
      data: {
        stageId,
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
            company: true,
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
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'deal_stage_updated',
        note: `Updated deal stage to: ${stage.name}`,
        userId: req.user.id,
        dealId: updatedDeal.id,
      },
    });

    res.json({
      success: true,
      message: 'Deal updated successfully',
      data: updatedDeal,
    });
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
};

/**
 * Update a deal's stage
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateDealStage = async (req, res) => {
  try {
    const { stageId } = req.body;

    // Check if deal exists
    const deal = await prisma.deal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if stage exists
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
      },
    });

    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    // Update deal stage
    const updatedDeal = await prisma.deal.update({
      where: { id: req.params.id },
      data: {
        stageId,
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
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'deal_stage_updated',
        note: `Updated deal stage to: ${stage.name}`,
        userId: req.user.id,
        dealId: updatedDeal.id,
      },
    });

    res.json({
      success: true,
      message: 'Deal stage updated successfully',
      data: updatedDeal,
    });
  } catch (error) {
    console.error('Error updating deal stage:', error);
    res.status(500).json({ error: 'Failed to update deal stage' });
  }
};

/**
 * Delete a deal
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteDeal = async (req, res) => {
  try {
    // Check if deal exists
    const deal = await prisma.deal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Delete deal
    await prisma.deal.delete({
      where: { id: req.params.id },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'deal_deleted',
        note: `Deleted deal: ${deal.title}`,
        userId: req.user.id,
        dealId: deal.id,
        contactId: deal.contactId,
      },
    });

    res.json({
      success: true,
      message: 'Deal deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
};

module.exports = {
  getDeals,
  getDealById,
  createDeal,
  updateDeal,
  updateDealStage,
  deleteDeal,
};
