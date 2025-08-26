const { prisma } = require('../services/db');

// Create a new email template
exports.createTemplate = async (req, res, next) => {
  try {
    console.log("--- POST /templates controller hit ---");
    console.log("User making request:", req.user);
    
    const { name, subject, body } = req.body;
    const userId = req.user.id;

    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'Name, subject, and body are required' });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body,
        userId: req.user.id
      },
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating email template:', error);
    next(error);
  }
};

// Get all email templates for the authenticated user
exports.getTemplates = async (req, res, next) => {
  try {
    console.log("--- GET /templates controller hit ---");
    console.log("User making request:", req.user);
    
    const userId = req.user.id;
    
    const templates = await prisma.emailTemplate.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    next(error);
  }
};

// Get a single email template by ID
exports.getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    next(error);
  }
};

// Update an email template by ID
exports.updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;
    const userId = req.user.id;

    // Check if the template exists and belongs to the user
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(body && { body }),
      },
    });

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating email template:', error);
    next(error);
  }
};

// Delete an email template by ID
exports.deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if the template exists and belongs to the user
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    await prisma.emailTemplate.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting email template:', error);
    next(error);
  }
};
