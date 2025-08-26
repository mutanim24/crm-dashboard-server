const express = require('express');
const { body, query } = require('express-validator');
const { prisma } = require('../services/db');

const router = express.Router();

/**
 * @route   GET /api/v1/contacts
 * @desc    Get all contacts for the authenticated user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      tagId,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      userId: req.user.id,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tagId) {
      where.tags = {
        some: {
          tagId: tagId,
        },
      };
    }

    // Get contacts
    const contacts = await prisma.contact.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        customFields: true,
        deals: {
          select: {
            id: true,
            title: true,
            value: true,
            stage: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.contact.count({ where });

    res.json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * @route   GET /api/v1/contacts/:id
 * @desc    Get a single contact by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        customFields: true,
        deals: {
          include: {
            stage: true,
            pipeline: true,
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

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

/**
 * @route   POST /api/v1/contacts
 * @desc    Create a new contact
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
  async (req, res) => {
    try {
      const { firstName, lastName, email, phone, company, tags, customFields } = req.body;

      // Create contact
      const contact = await prisma.contact.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          company,
          userId: req.user.id,
          tags: tags
            ? {
                create: tags.map((tagId) => ({ tagId })),
              }
            : undefined,
          customFields: customFields
            ? {
                create: customFields.map((field) => ({
                  name: field.name,
                  type: field.type,
                  data: field.data || {},
                })),
              }
            : undefined,
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          customFields: true,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'contact_created',
          note: `Created contact: ${firstName || ''} ${lastName || ''}`,
          userId: req.user.id,
          contactId: contact.id,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Contact created successfully',
        data: contact,
      });
    } catch (error) {
      console.error('Error creating contact:', error);
      res.status(500).json({ error: 'Failed to create contact' });
    }
  }
);

/**
 * @route   PUT /api/v1/contacts/:id
 * @desc    Update a contact
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
  async (req, res) => {
    try {
      const { firstName, lastName, email, phone, company, tags, customFields } = req.body;

      // Check if contact exists
      const existingContact = await prisma.contact.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!existingContact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Update contact
      const updatedContact = await prisma.contact.update({
        where: { id: req.params.id },
        data: {
          firstName,
          lastName,
          email,
          phone,
          company,
          tags: tags
            ? {
                deleteMany: {},
                create: tags.map((tagId) => ({ tagId })),
              }
            : undefined,
          customFields: customFields
            ? {
                deleteMany: {},
                create: customFields.map((field) => ({
                  name: field.name,
                  type: field.type,
                  data: field.data || {},
                })),
              }
            : undefined,
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          customFields: true,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'contact_updated',
          note: `Updated contact: ${firstName || ''} ${lastName || ''}`,
          userId: req.user.id,
          contactId: updatedContact.id,
        },
      });

      res.json({
        success: true,
        message: 'Contact updated successfully',
        data: updatedContact,
      });
    } catch (error) {
      console.error('Error updating contact:', error);
      res.status(500).json({ error: 'Failed to update contact' });
    }
  }
);

/**
 * @route   DELETE /api/v1/contacts/:id
 * @desc    Delete a contact
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if contact exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Delete contact
    await prisma.contact.delete({
      where: { id: req.params.id },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'contact_deleted',
        note: `Deleted contact: ${existingContact.firstName || ''} ${existingContact.lastName || ''}`,
        userId: req.user.id,
        contactId: existingContact.id,
      },
    });

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

module.exports = router;
