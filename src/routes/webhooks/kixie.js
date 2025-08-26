const express = require('express');
const { prisma } = require('../../services/db');

const router = express.Router();

/**
 * @route   POST /webhooks/kixie/call
 * @desc    Handle Kixie call events
 * @access  Public
 */
router.post('/call', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Log webhook request
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/kixie/call',
        payload: req.body,
      },
    });

    // Handle different event types
    switch (event) {
      case 'call_started':
        // Handle call started event
        console.log('Kixie call started:', data);
        break;
        
      case 'call_ended':
        // Handle call ended event
        console.log('Kixie call ended:', data);
        break;
        
      case 'missed_call':
        // Handle missed call event
        console.log('Kixie missed call:', data);
        break;
        
      default:
        console.log('Unhandled Kixie event:', event);
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing Kixie webhook:', error);
    
    // Log error
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/kixie/call',
        payload: req.body,
        error: error.message,
        status: 500,
      },
    });

    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * @route   POST /webhooks/kixie/sms
 * @desc    Handle Kixie SMS events
 * @access  Public
 */
router.post('/sms', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Log webhook request
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/kixie/sms',
        payload: req.body,
      },
    });

    // Handle different event types
    switch (event) {
      case 'sms_sent':
        // Handle SMS sent event
        console.log('Kixie SMS sent:', data);
        break;
        
      case 'sms_delivered':
        // Handle SMS delivered event
        console.log('Kixie SMS delivered:', data);
        break;
        
      case 'sms_failed':
        // Handle SMS failed event
        console.log('Kixie SMS failed:', data);
        break;
        
      default:
        console.log('Unhandled Kixie SMS event:', event);
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing Kixie SMS webhook:', error);
    
    // Log error
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/kixie/sms',
        payload: req.body,
        error: error.message,
        status: 500,
      },
    });

    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * @route   POST /webhooks/kixie/test
 * @desc    Simulate Kixie webhook for testing
 * @access  Public
 */
router.post('/test', async (req, res) => {
  try {
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }
    
    // Find the contact
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
      },
    });
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Create a sample activity
    const activity = await prisma.activity.create({
      data: {
        type: 'kixie_call_ended',
        note: `Outgoing call to ${contact.phone || 'N/A'} - Duration: 5:32`,
        contactId: contact.id,
        userId: contact.userId, // Assuming the contact has a userId field
      },
    });
    
    console.log('Simulated Kixie webhook activity created:', activity);
    
    res.status(201).json({
      success: true,
      message: 'Kixie webhook simulated successfully',
      activity,
    });
  } catch (error) {
    console.error('Error simulating Kixie webhook:', error);
    
    // Log error
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/kixie/test',
        payload: req.body,
        error: error.message,
        status: 500,
      },
    });

    res.status(500).json({ error: 'Failed to simulate webhook' });
  }
});

module.exports = router;
