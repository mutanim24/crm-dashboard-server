const express = require('express');
const { prisma } = require('../../services/db');

const router = express.Router();

/**
 * @route   POST /webhooks/iclosed/deal
 * @desc    Handle iClosed deal events
 * @access  Public
 */
router.post('/deal', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Log webhook request
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/iclosed/deal',
        payload: req.body,
      },
    });

    // Handle different event types
    switch (event) {
      case 'deal_created':
        // Handle deal created event
        console.log('iClosed deal created:', data);
        break;
        
      case 'deal_updated':
        // Handle deal updated event
        console.log('iClosed deal updated:', data);
        break;
        
      case 'deal_deleted':
        // Handle deal deleted event
        console.log('iClosed deal deleted:', data);
        break;
        
      case 'stage_changed':
        // Handle stage changed event
        console.log('iClosed deal stage changed:', data);
        break;
        
      default:
        console.log('Unhandled iClosed event:', event);
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing iClosed webhook:', error);
    
    // Log error
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/iclosed/deal',
        payload: req.body,
        error: error.message,
        status: 500,
      },
    });

    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * @route   POST /webhooks/iclosed/contact
 * @desc    Handle iClosed contact events
 * @access  Public
 */
router.post('/contact', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Log webhook request
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/iclosed/contact',
        payload: req.body,
      },
    });

    // Handle different event types
    switch (event) {
      case 'contact_created':
        // Handle contact created event
        console.log('iClosed contact created:', data);
        break;
        
      case 'contact_updated':
        // Handle contact updated event
        console.log('iClosed contact updated:', data);
        break;
        
      case 'contact_deleted':
        // Handle contact deleted event
        console.log('iClosed contact deleted:', data);
        break;
        
      default:
        console.log('Unhandled iClosed contact event:', event);
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing iClosed contact webhook:', error);
    
    // Log error
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/iclosed/contact',
        payload: req.body,
        error: error.message,
        status: 500,
      },
    });

    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * @route   POST /webhooks/iclosed/activity
 * @desc    Handle iClosed activity events
 * @access  Public
 */
router.post('/activity', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Log webhook request
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/iclosed/activity',
        payload: req.body,
      },
    });

    // Handle different event types
    switch (event) {
      case 'activity_created':
        // Handle activity created event
        console.log('iClosed activity created:', data);
        break;
        
      case 'activity_updated':
        // Handle activity updated event
        console.log('iClosed activity updated:', data);
        break;
        
      case 'activity_deleted':
        // Handle activity deleted event
        console.log('iClosed activity deleted:', data);
        break;
        
      default:
        console.log('Unhandled iClosed activity event:', event);
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing iClosed activity webhook:', error);
    
    // Log error
    await prisma.webhookLog.create({
      data: {
        endpoint: '/webhooks/iclosed/activity',
        payload: req.body,
        error: error.message,
        status: 500,
      },
    });

    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

module.exports = router;
