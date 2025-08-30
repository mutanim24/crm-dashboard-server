const express = require('express');
const { handleIncomingWebhook } = require('../../controllers/iclosedWebhookController');

const router = express.Router();

/**
 * @route   POST /api/v1/webhooks/iclosed
 * @desc    Handle iClosed webhook events for contact data
 * @access  Public
 */
router.post('/', handleIncomingWebhook);

module.exports = router;
