const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const auth = require('../middleware/auth');

// GET /api/v1/workflows - Get all workflows
router.get('/', auth, workflowController.getWorkflows);

// POST /api/v1/workflows - Create a new workflow
router.post('/', auth, workflowController.createWorkflow);

// GET /api/v1/workflows/:id - Get a single workflow
router.get('/:id', auth, workflowController.getWorkflow);

// PUT /api/v1/workflows/:id - Update a workflow
router.put('/:id', auth, workflowController.updateWorkflow);

// DELETE /api/v1/workflows/:id - Delete a workflow
router.delete('/:id', auth, workflowController.deleteWorkflow);

module.exports = router;
