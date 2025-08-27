const express = require('express');
const router = express.Router();
const { upsertKixieCredentials, initiateCall, sendSms, handleKixieWebhook, toggleKixieIntegration, simulateWebhook, handleIclosedWebhook } = require('../controllers/integrationController');
const authMiddleware = require('../middleware/auth');

/**
 * @route   POST /api/v1/integrations/kixie
 * @desc    Save or update Kixie API credentials
 * @access  Private
 */
router.post('/kixie', authMiddleware, upsertKixieCredentials);

/**
 * @route   POST /api/v1/integrations/kixie/call
 * @desc    Initiate a call via Kixie API
 * @access  Private
 */
router.post('/kixie/call', authMiddleware, initiateCall);

/**
 * @route   POST /api/v1/integrations/kixie/sms
 * @desc    Send an SMS via Kixie API
 * @access  Private
 */
router.post('/kixie/sms', authMiddleware, sendSms);

/**
 * @route   POST /api/v1/integrations/kixie/webhook
 * @desc    Receive webhook events from Kixie
 * @access  Public
 */
router.post('/kixie/webhook', handleKixieWebhook);

/**
 * @route   POST /api/v1/integrations/kixie/toggle
 * @desc    Toggle Kixie integration status
 * @access  Private
 */
router.post('/kixie/toggle', authMiddleware, toggleKixieIntegration);

/**
 * @route   POST /api/v1/integrations/kixie/webhook/test
 * @desc    Simulate a Kixie webhook for testing purposes
 * @access  Private
 */
router.post('/kixie/webhook/test', authMiddleware, simulateWebhook);

/**
 * @route   POST /api/v1/integrations/webhooks/iclosed
 * @desc    Receive webhook events from iClosed/Zapier
 * @access  Public
 */
router.post('/webhooks/iclosed', handleIclosedWebhook);

module.exports = router;
