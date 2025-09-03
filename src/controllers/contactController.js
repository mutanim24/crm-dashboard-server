const { prisma } = require('../services/db');

/**
 * Get all contacts for the authenticated user with pagination, search, and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getContacts = async (req, res) => {
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
};

/**
 * Get a single contact by ID with all related data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getContactById = async (req, res) => {
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
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Transform the contact data to match the new data contract
    const transformedContact = {
      ...contact,
      tags: contact.tags.map(tagJoin => tagJoin.tag.name)
    };

    res.status(200).json({
      success: true,
      data: transformedContact,
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
};

/**
 * Create a new contact
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createContact = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, company, tags = [] } = req.body;

    // Process tags for connectOrCreate
    const tagConnectOrCreate = tags.map(tagName => ({
      where: { name: tagName },
      create: { name: tagName },
    }));

    // Create contact with the processed tags
    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        userId: req.user.id,
        tags: { create: tagConnectOrCreate.map(tco => ({ tag: { connectOrCreate: tco } })) }
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
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
};

/**
 * Update a contact
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateContact = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, company, tags = [] } = req.body;

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

    // Process tags for connectOrCreate
    const tagConnectOrCreate = tags.map(tagName => ({
      where: { name: tagName },
      create: { name: tagName },
    }));

    // Update contact with the processed tags
    const updatedContact = await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        tags: {
          set: [], // First, disconnect all old tags
          create: tagConnectOrCreate.map(tco => ({ tag: { connectOrCreate: tco } }))
        }
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
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
};

/**
 * Delete a contact
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteContact = async (req, res) => {
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

    // Try to log activity, but don't fail the request if this fails
    try {
      await prisma.activity.create({
        data: {
          type: 'contact_deleted',
          note: `Deleted contact: ${existingContact.firstName || ''} ${existingContact.lastName || ''}`,
          userId: req.user.id,
          contactId: existingContact.id,
        },
      });
    } catch (activityError) {
      console.error('Error logging contact deletion activity:', activityError);
      // Continue without failing the request
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
};

/**
 * Assign a tag to a contact
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const assignTagToContact = async (req, res) => {
  try {
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({ error: 'Tag ID is required' });
    }

    // Check if contact exists
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if tag exists
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
      },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if tag is already assigned to contact
    const existingAssignment = await prisma.contactTag.findFirst({
      where: {
        contactId: req.params.id,
        tagId,
      },
    });

    if (existingAssignment) {
      return res.status(400).json({ error: 'Tag is already assigned to this contact' });
    }

    // Assign tag to contact
    const assignment = await prisma.contactTag.create({
      data: {
        contactId: req.params.id,
        tagId,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'tag_assigned',
        note: `Assigned tag: ${tag.name} to contact: ${contact.firstName || ''} ${contact.lastName || ''}`,
        userId: req.user.id,
        contactId: contact.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Tag assigned successfully',
      data: assignment,
    });
  } catch (error) {
    console.error('Error assigning tag to contact:', error);
    res.status(500).json({ error: 'Failed to assign tag to contact' });
  }
};

/**
 * Remove a tag from a contact
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeTagFromContact = async (req, res) => {
  try {
    const { tagId } = req.params;

    // Check if contact exists
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if tag exists
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
      },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if tag is assigned to contact
    const existingAssignment = await prisma.contactTag.findFirst({
      where: {
        contactId: req.params.id,
        tagId,
      },
    });

    if (!existingAssignment) {
      return res.status(400).json({ error: 'Tag is not assigned to this contact' });
    }

    // Remove tag from contact
    await prisma.contactTag.delete({
      where: {
        id: existingAssignment.id,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'tag_removed',
        note: `Removed tag: ${tag.name} from contact: ${contact.firstName || ''} ${contact.lastName || ''}`,
        userId: req.user.id,
        contactId: contact.id,
      },
    });

    res.json({
      success: true,
      message: 'Tag removed successfully',
    });
  } catch (error) {
    console.error('Error removing tag from contact:', error);
    res.status(500).json({ error: 'Failed to remove tag from contact' });
  }
};

module.exports = {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  assignTagToContact,
  removeTagFromContact,
};
