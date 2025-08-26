const express = require('express');
const { body } = require('express-validator');
const { prisma } = require('../services/db');

const router = express.Router();

/**
 * @route   GET /api/v1/deals
 * @desc    Get all deals for the authenticated user
 * @access  Private
 */
router.get('/', async (req, res) => {
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
});

/**
 * @route   GET /api/v1/deals/:id
 * @desc    Get a single deal by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
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
});

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
  async (req, res) => {
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
  }
);

/**
 * @route   PUT /api/v1/deals/:id
 * @desc    Update a deal
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('title')
      .optional()
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
      .optional()
      .isString()
      .withMessage('Pipeline ID must be a string'),
    body('stageId')
      .optional()
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
  async (req, res) => {
    try {
      const { title, value, currency, pipelineId, stageId, contactId, data } = req.body;

      // Check if deal exists
      const existingDeal = await prisma.deal.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!existingDeal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // If pipelineId is provided, check if pipeline exists
      if (pipelineId) {
        const pipeline = await prisma.pipeline.findFirst({
          where: {
            id: pipelineId,
            userId: req.user.id,
          },
        });

        if (!pipeline) {
          return res.status(404).json({ error: 'Pipeline not found' });
        }
      }

      // If stageId is provided, check if stage exists
      if (stageId && pipelineId) {
        const stage = await prisma.pipelineStage.findFirst({
          where: {
            id: stageId,
            pipelineId,
          },
        });

        if (!stage) {
          return res.status(404).json({ error: 'Stage not found in the specified pipeline' });
        }
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

      // Update deal
      const updatedDeal = await prisma.deal.update({
        where: { id: req.params.id },
        data: {
          title,
          value,
          currency,
          pipelineId,
          stageId,
          contactId,
          data,
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
          type: 'deal_updated',
          note: `Updated deal: ${title || updatedDeal.title}`,
          userId: req.user.id,
          dealId: updatedDeal.id,
          contactId: updatedDeal.contactId,
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
  }
);

/**
 * @route   DELETE /api/v1/deals/:id
 * @desc    Delete a deal
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if deal exists
    const existingDeal = await prisma.deal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existingDeal) {
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
        note: `Deleted deal: ${existingDeal.title}`,
        userId: req.user.id,
        dealId: existingDeal.id,
        contactId: existingDeal.contactId,
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
});

module.exports = router;
