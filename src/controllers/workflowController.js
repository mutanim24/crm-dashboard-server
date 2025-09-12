const { prisma } = require('../services/db');

// Create a new workflow
exports.createWorkflow = async (req, res) => {
  try {
    const { name, definition } = req.body;
    
    // Validate required fields
    if (!name || !definition) {
      return res.status(400).json({ error: 'Name and definition are required' });
    }
    
    // The definition should already be a JSON object from the frontend
    // We'll save it directly without any parsing or transformation
    console.log('Saving workflow:', { name, definition });
    
    const workflow = await prisma.automationWorkflow.create({
      data: {
        name,
        definition, // Save the entire JSON object as is
        userId: req.user.id // From auth middleware
      }
    });
    
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
};

// Get all workflows for the authenticated user
exports.getWorkflows = async (req, res) => {
  try {
    const workflows = await prisma.automationWorkflow.findMany({
      where: {
        userId: req.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Return the definition as-is without modification
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
};

// Get a single workflow by ID with its definition
exports.getWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    
    const workflow = await prisma.automationWorkflow.findFirst({
      where: {
        id,
        userId: req.user.id // Ensure user owns this workflow
      }
    });
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Return the definition as-is without modification
    console.log('Retrieved workflow with definition:', workflow);
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
};

// Update a workflow
exports.updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, definition } = req.body;
    
    // Check if workflow exists and user owns it
    const existingWorkflow = await prisma.automationWorkflow.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });
    
    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Update the workflow with the definition as-is
    const updateData = {
      name,
      definition // Save the entire JSON object as is
    };
    
    console.log('Updating workflow:', updateData);
    
    const updatedWorkflow = await prisma.automationWorkflow.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
};

// Delete a workflow
exports.deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if workflow exists and user owns it
    const existingWorkflow = await prisma.automationWorkflow.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });
    
    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Delete the workflow
    await prisma.automationWorkflow.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
};
