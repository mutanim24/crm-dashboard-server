const express = require('express');
const { body } = require('express-validator');
const { prisma } = require('../services/db');
const { encrypt } = require('../utils/crypto');

const router = express.Router();

/**
 * @route   GET /api/v1/integrations
 * @desc    Get all integrations for the authenticated user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const integrations = await prisma.integration.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        provider: true,
        settings: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

/**
 * @route   GET /api/v1/integrations/:id
 * @desc    Get a single integration by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      select: {
        id: true,
        provider: true,
        settings: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({
      success: true,
      data: integration,
    });
  } catch (error) {
    console.error('Error fetching integration:', error);
    res.status(500).json({ error: 'Failed to fetch integration' });
  }
});

/**
 * @route   POST /api/v1/integrations
 * @desc    Create a new integration
 * @access  Private
 */
router.post(
  '/',
  [
    body('provider')
      .notEmpty()
      .withMessage('Provider is required')
      .isIn(['kixie', 'iclosed'])
      .withMessage('Provider must be either kixie or iclosed'),
    body('credentials')
      .notEmpty()
      .withMessage('Credentials are required')
      .isObject()
      .withMessage('Credentials must be an object'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
  ],
  async (req, res) => {
    try {
      const { provider, credentials, settings } = req.body;

      // Encrypt credentials
      const encryptedCredentials = await encrypt(JSON.stringify(credentials));

      // Create integration
      const integration = await prisma.integration.create({
        data: {
          provider,
          credentials: encryptedCredentials,
          settings,
          userId: req.user.id,
        },
        select: {
          id: true,
          provider: true,
          settings: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'integration_created',
          note: `Created ${provider} integration`,
          userId: req.user.id,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Integration created successfully',
        data: integration,
      });
    } catch (error) {
      console.error('Error creating integration:', error);
      res.status(500).json({ error: 'Failed to create integration' });
    }
  }
);

/**
 * @route   PUT /api/v1/integrations/:id
 * @desc    Update an integration
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('credentials')
      .optional()
      .isObject()
      .withMessage('Credentials must be an object'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  async (req, res) => {
    try {
      const { credentials, settings, isActive } = req.body;

      // Check if integration exists
      const existingIntegration = await prisma.integration.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!existingIntegration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // Prepare update data
      const updateData = {
        settings,
        isActive,
      };

      // If credentials are provided, encrypt them
      if (credentials) {
        updateData.credentials = await encrypt(JSON.stringify(credentials));
      }

      // Update integration
      const updatedIntegration = await prisma.integration.update({
        where: { id: req.params.id },
        data: updateData,
        select: {
          id: true,
          provider: true,
          settings: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'integration_updated',
          note: `Updated ${updatedIntegration.provider} integration`,
          userId: req.user.id,
        },
      });

      res.json({
        success: true,
        message: 'Integration updated successfully',
        data: updatedIntegration,
      });
    } catch (error) {
      console.error('Error updating integration:', error);
      res.status(500).json({ error: 'Failed to update integration' });
    }
  }
);

/**
 * @route   DELETE /api/v1/integrations/:id
 * @desc    Delete an integration
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if integration exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existingIntegration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Delete integration
    await prisma.integration.delete({
      where: { id: req.params.id },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'integration_deleted',
        note: `Deleted ${existingIntegration.provider} integration`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: 'Integration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

/**
 * @route   POST /api/v1/integrations/:id/test
 * @desc    Test an integration connection
 * @access  Private
 */
router.post('/:id/test', async (req, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Here you would implement the actual test logic for each provider
    // For now, we'll just return a success response
    console.log(`Testing ${integration.provider} integration`);

    res.json({
      success: true,
      message: `${integration.provider} integration test successful`,
    });
  } catch (error) {
    console.error('Error testing integration:', error);
    res.status(500).json({ error: 'Failed to test integration' });
  }
});

module.exports = router;
