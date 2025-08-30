const { prisma } = require('../services/db');
const { triggerWorkflow } = require('../services/automationService');

/**
 * Placeholder function to create or update a contact
 * @param {object} contactData - Contact data
 * @returns {Promise<object>} - Created/updated contact
 */
async function upsertContact(contactData) {
  try {
    const { email, firstName, lastName, phone, userId } = contactData;
    
    if (!email) {
      throw new Error('Email is required for contact operations');
    }
    
    const existingContact = await prisma.contact.findUnique({
      where: { email }
    });
    
    if (existingContact) {
      return await prisma.contact.update({
        where: { id: existingContact.id },
        data: {
          firstName: firstName || existingContact.firstName,
          lastName: lastName || existingContact.lastName,
          phone: phone || existingContact.phone,
          userId
        }
      });
    } else {
      return await prisma.contact.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          userId
        }
      });
    }
  } catch (error) {
    console.error('[iClosed Webhook] Error in upsertContact:', error);
    throw error;
  }
}

/**
 * Placeholder function to create a new deal
 * @param {object} dealData - Deal data
 * @returns {Promise<object>} - Created deal
 */
async function createDeal(dealData) {
  try {
    const { title, value, stageId, pipelineId, contactId, userId, source } = dealData;
    
    // Get the first pipeline if no specific pipeline is provided
    let targetPipelineId = pipelineId;
    if (!targetPipelineId) {
      const pipeline = await prisma.pipeline.findFirst({
        where: { userId },
        include: { stages: true }
      });
      
      if (!pipeline) {
        // Create a default pipeline if none exists
        const defaultPipeline = await prisma.pipeline.create({
          data: {
            name: 'Default Pipeline',
            userId
          }
        });
        
        // Create default stages for the pipeline
        const defaultStages = [
          { name: 'New', order: 1, pipelineId: defaultPipeline.id },
          { name: 'Qualified', order: 2, pipelineId: defaultPipeline.id },
          { name: 'Proposal', order: 3, pipelineId: defaultPipeline.id },
          { name: 'Negotiation', order: 4, pipelineId: defaultPipeline.id },
          { name: 'Closed Won', order: 5, pipelineId: defaultPipeline.id },
          { name: 'Closed Lost', order: 6, pipelineId: defaultPipeline.id }
        ];
        
        await prisma.pipelineStage.createMany({
          data: defaultStages
        });
        
        targetPipelineId = defaultPipeline.id;
      } else {
        targetPipelineId = pipeline.id;
      }
    }
    
    // Determine the stage for the deal
    let targetStageId = stageId;
    if (!targetStageId) {
      const pipeline = await prisma.pipeline.findUnique({
        where: { id: targetPipelineId },
        include: { stages: true }
      });
      
      if (pipeline && pipeline.stages.length > 0) {
        targetStageId = pipeline.stages[0].id; // Use first stage as default
      }
    }
    
    return await prisma.deal.create({
      data: {
        title,
        value: value || 0,
        stageId: targetStageId,
        pipelineId: targetPipelineId,
        contactId,
        userId,
        data: { source: source || 'iClosed' }
      }
    });
  } catch (error) {
    console.error('[iClosed Webhook] Error in createDeal:', error);
    throw error;
  }
}

/**
 * Placeholder function to update deal stage
 * @param {string} dealId - Deal ID
 * @param {string} stageId - New stage ID
 * @returns {Promise<object>} - Updated deal
 */
async function updateDealStage(dealId, stageId) {
  try {
    return await prisma.deal.update({
      where: { id: dealId },
      data: { stageId }
    });
  } catch (error) {
    console.error('[iClosed Webhook] Error in updateDealStage:', error);
    throw error;
  }
}

/**
 * Placeholder function to log an activity
 * @param {object} activityData - Activity data
 * @returns {Promise<object>} - Created activity
 */
async function logActivity(activityData) {
  try {
    const { type, note, contactId, dealId, userId, data } = activityData;
    
    return await prisma.activity.create({
      data: {
        type,
        note,
        contactId,
        dealId,
        userId,
        data
      }
    });
  } catch (error) {
    console.error('[iClosed Webhook] Error in logActivity:', error);
    throw error;
  }
}

/**
 * Placeholder function to check if an event has been processed
 * @param {string} eventId - Event ID
 * @returns {Promise<boolean>} - True if processed
 */
async function isProcessed(eventId) {
  try {
    if (!eventId) return false;
    
    const existingLog = await prisma.webhookLog.findUnique({
      where: { eventId }
    });
    
    return !!existingLog;
  } catch (error) {
    console.error('[iClosed Webhook] Error in isProcessed:', error);
    return false;
  }
}

/**
 * Placeholder function to mark an event as processed
 * @param {string} eventId - Event ID
 * @param {object} payload - Event payload
 * @returns {Promise<object>} - Created log entry
 */
async function markProcessed(eventId, payload) {
  try {
    return await prisma.webhookLog.create({
      data: {
        eventId,
        endpoint: '/api/v1/webhooks/iclosed',
        payload,
        status: 200,
        processedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[iClosed Webhook] Error in markProcessed:', error);
    throw error;
  }
}

/**
 * Handles incoming webhook events from iClosed
 * @route POST /api/v1/webhooks/iclosed
 * @desc Receive webhook events from iClosed, validate secret, and process events
 * @access Public
 */
const handleIncomingWebhook = async (req, res) => {
  try {
    // Check for secret token in headers
    const secretToken = req.headers['x-webhook-secret'];
    const expectedSecret = process.env.ICLOSED_SECRET;
    
    if (!secretToken || secretToken !== expectedSecret) {
      console.error('[iClosed Webhook] Invalid or missing secret token');
      return res.status(401).json({ 
        status: 'error', 
        message: 'Unauthorized: Invalid or missing secret token' 
      });
    }
    
    // Extract data from the webhook payload
    const payload = req.body;
    
    // Validate required fields
    if (!payload || !payload.event) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Bad Request: Missing event in payload' 
      });
    }
    
    // Check for event_id for idempotency
    const eventId = payload.event_id || payload.data?.event_id;
    
    if (eventId) {
      const alreadyProcessed = await isProcessed(eventId);
      if (alreadyProcessed) {
        console.log(`[iClosed Webhook] Duplicate event detected with ID: ${eventId}`);
        return res.status(200).json({ 
          status: 'success', 
          message: 'Duplicate event - already processed',
          eventId 
        });
      }
    }
    
    // Find a user to associate with the contact and deals
    let user;
    try {
      // Try to find user by ID if provided in payload
      if (payload.userId) {
        user = await prisma.user.findUnique({
          where: { id: payload.userId }
        });
      }
      
      // If no user found or no userId provided, get the first user in the system
      if (!user) {
        user = await prisma.user.findFirst({
          orderBy: { createdAt: 'asc' }
        });
      }
      
      if (!user) {
        console.error('[iClosed Webhook] No users found in the database');
        return res.status(500).json({ 
          status: 'error', 
          message: 'Internal Server Error: No users found' 
        });
      }
    } catch (error) {
      console.error('[iClosed Webhook] Error finding user:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Internal Server Error: Failed to find user' 
      });
    }
    
    // Process based on event type
    switch (payload.event) {
      case 'appointment_booked':
        await handleAppointmentBooked(payload, user);
        break;
        
      case 'status_changed':
        await handleStatusChanged(payload, user);
        break;
        
      default:
        console.log(`[iClosed Webhook] Unhandled event type: ${payload.event}`);
        return res.status(200).json({ 
          status: 'success', 
          message: `Event type ${payload.event} received but not processed` 
        });
    }
    
    // Mark event as processed if it has an ID
    if (eventId) {
      await markProcessed(eventId, payload);
    }
    
    // Return success response
    return res.status(200).json({ 
      status: 'success', 
      message: 'Webhook processed successfully',
      eventId 
    });
    
  } catch (error) {
    console.error('[iClosed Webhook] Unexpected error:', error);
    
    // Return error response
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal Server Error: Failed to process webhook',
      error: error.message 
    });
  }
};

/**
 * Handle appointment_booked event
 * @param {object} payload - Event payload
 * @param {object} user - User object
 */
async function handleAppointmentBooked(payload, user) {
  try {
    console.log('[iClosed Webhook] Processing appointment_booked event');
    
    // Extract contact information
    const contactData = payload.contact || payload.data?.contact || {};
    const email = contactData.email || payload.email;
    const name = contactData.name || contactData.full_name;
    const phone = contactData.phone || contactData.phone_number;
    
    // Parse name into first and last name
    const parseName = (fullName) => {
      if (!fullName || typeof fullName !== 'string') {
        return { firstName: null, lastName: null };
      }
      
      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length === 1) {
        return { firstName: nameParts[0], lastName: null };
      }
      
      return {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ')
      };
    };
    
    const { firstName, lastName } = parseName(name);
    
    // Create or update contact
    const contact = await upsertContact({
      email,
      firstName,
      lastName,
      phone,
      userId: user.id
    });
    
    // Extract deal information
    const dealData = payload.deal || payload.data?.deal || {};
    const dealTitle = dealData.title || dealData.name || `Appointment with ${name}`;
    const dealValue = dealData.value || dealData.amount || 0;
    
    // Create a new deal with stage "New" and source "iClosed"
    const deal = await createDeal({
      title: dealTitle,
      value: dealValue,
      userId: user.id,
      source: 'iClosed',
      contactId: contact.id
    });
    
    // Log an activity for the appointment time
    const appointmentTime = payload.appointment_time || payload.data?.appointment_time || new Date().toISOString();
    
    await logActivity({
      type: 'APPOINTMENT_BOOKED',
      note: `Appointment booked for ${appointmentTime}`,
      contactId: contact.id,
      dealId: deal.id,
      userId: user.id,
      data: {
        source: 'iClosed',
        appointmentTime,
        dealName: dealTitle,
        bookingDetails: payload.booking_details || payload.data?.booking_details || {}
      }
    });
    
    console.log(`[iClosed Webhook] Successfully processed appointment_booked for ${email}`);
    
  } catch (error) {
    console.error('[iClosed Webhook] Error in handleAppointmentBooked:', error);
    throw error;
  }
}

/**
 * Handle status_changed event
 * @param {object} payload - Event payload
 * @param {object} user - User object
 */
async function handleStatusChanged(payload, user) {
  try {
    console.log('[iClosed Webhook] Processing status_changed event');
    
    // Extract deal information
    const dealData = payload.deal || payload.data?.deal || {};
    const dealId = dealData.id || dealData.deal_id;
    const newStatus = dealData.new_status || payload.new_status;
    
    if (!dealId) {
      throw new Error('Deal ID is required for status_changed event');
    }
    
    // Find the deal
    const deal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        userId: user.id
      },
      include: {
        pipeline: {
          include: {
            stages: true
          }
        }
      }
    });
    
    if (!deal) {
      throw new Error(`Deal with ID ${dealId} not found`);
    }
    
    // Find the stage that matches the new status
    const targetStage = deal.pipeline.stages.find(stage => 
      stage.name.toLowerCase() === newStatus.toLowerCase() ||
      stage.name.toLowerCase().includes(newStatus.toLowerCase())
    );
    
    if (!targetStage) {
      throw new Error(`Stage with status "${newStatus}" not found in pipeline`);
    }
    
    // Update the deal stage
    await updateDealStage(dealId, targetStage.id);
    
    // Log the status change as an activity
    await logActivity({
      type: 'DEAL_STATUS_CHANGED',
      note: `Deal status changed to: ${newStatus}`,
      dealId: deal.id,
      userId: user.id,
      data: {
        source: 'iClosed',
        previousStatus: deal.stage.name,
        newStatus,
        changedAt: new Date().toISOString()
      }
    });
    
    console.log(`[iClosed Webhook] Successfully updated deal ${dealId} status to ${newStatus}`);
    
  } catch (error) {
    console.error('[iClosed Webhook] Error in handleStatusChanged:', error);
    throw error;
  }
};

module.exports = {
  handleIncomingWebhook,
  handleAppointmentBooked,
  handleStatusChanged
};
