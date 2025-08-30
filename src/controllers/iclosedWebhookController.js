const { prisma } = require('../services/db');
const { triggerWorkflow } = require('../services/automationService');

/**
 * Generates a unique idempotency key from webhook payload
 * @param {object} payload - The webhook payload
 * @returns {string} - Unique idempotency key
 */
function generateIdempotencyKey(payload) {
  // Create a hash based on payload content and timestamp
  const content = JSON.stringify(payload);
  const timestamp = new Date().toISOString().slice(0, 10); // Date only
  const crypto = require('crypto');
  
  return crypto
    .createHash('sha256')
    .update(content + timestamp)
    .digest('hex');
}

/**
 * Checks if a webhook has already been processed
 * @param {string} idempotencyKey - The idempotency key
 * @returns {boolean} - True if already processed
 */
async function isWebhookProcessed(idempotencyKey) {
  try {
    const existingLog = await prisma.webhookLog.findUnique({
      where: { idempotencyKey }
    });
    
    return !!existingLog;
  } catch (error) {
    console.error('[iClosed Webhook] Error checking idempotency:', error);
    return false;
  }
}

/**
 * Logs processed webhook for idempotency
 * @param {string} idempotencyKey - The idempotency key
 * @param {object} payload - The webhook payload
 * @param {string} status - Processing status
 */
async function logProcessedWebhook(idempotencyKey, payload, status = 'success') {
  try {
    await prisma.webhookLog.create({
      data: {
        idempotencyKey,
        endpoint: '/api/v1/webhooks/iclosed',
        payload,
        status: status === 'success' ? 200 : 500,
        processedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[iClosed Webhook] Error logging webhook:', error);
  }
}

/**
 * Handles incoming webhook events from iClosed/Zapier
 * @route POST /api/v1/webhooks/iclosed
 * @desc Receive webhook events from iClosed/Zapier, parse contact and deal data, and perform UPSERT operations
 * @access Public
 */
const handleIncomingWebhook = async (req, res) => {
  try {
    // Log the entire incoming payload
    console.log('--- ICLOSED WEBHOOK RECEIVED ---');
    console.log(JSON.stringify(req.body, null, 2));

    // Extract data from the webhook payload
    const payload = req.body.data || req.body.payload || req.body;
    
    // Generate idempotency key and check if webhook already processed
    const idempotencyKey = generateIdempotencyKey(payload);
    const alreadyProcessed = await isWebhookProcessed(idempotencyKey);
    
    if (alreadyProcessed) {
      console.log(`[iClosed Webhook] Duplicate webhook detected with idempotency key: ${idempotencyKey}`);
      return res.status(200).json({ 
        status: 'success', 
        message: 'Duplicate webhook - already processed',
        idempotencyKey 
      });
    }
    
    // Process contact data first
    const email = payload.contact?.email || payload.email || payload.Email;
    const name = payload.contact?.name || payload.name || payload.Name || payload.full_name || payload.Full_Name;
    const phone = payload.contact?.phone || payload.phone || payload.Phone || payload.phone_number || payload.Phone_Number;

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
        return res.status(200).json({ status: 'success', message: 'Webhook received' });
      }
    } catch (error) {
      console.error('[iClosed Webhook] Error finding user:', error);
      return res.status(200).json({ status: 'success', message: 'Webhook received' });
    }

    // Process contact data
    if (email && typeof email === 'string' && email.includes('@')) {
      try {
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

        const existingContact = await prisma.contact.findUnique({
          where: { email: email }
        });

        if (existingContact) {
          await prisma.contact.update({
            where: { id: existingContact.id },
            data: {
              firstName: firstName || existingContact.firstName,
              lastName: lastName || existingContact.lastName,
              phone: phone || existingContact.phone,
              userId: user.id
            }
          });
          console.log(`[iClosed Webhook] Contact updated for ${email}`);
        } else {
          await prisma.contact.create({
            data: {
              firstName,
              lastName,
              email,
              phone,
              userId: user.id
            }
          });
          console.log(`[iClosed Webhook] New contact created for ${email}`);
        }
      } catch (error) {
        console.error('[iClosed Webhook] Error during contact UPSERT operation:', error);
      }
    }

    // Process deal data if present
    if (payload.deal) {
      try {
        const dealData = payload.deal;
        const dealTitle = dealData.title || dealData.name || dealData.Title || dealData.Name;
        const dealValue = dealData.value || dealValue.amount || dealData.Value || dealData.Amount || 0;
        const dealStageId = dealData.stageId || dealData.pipeline_stage_id || dealData.StageId || dealData.Pipeline_Stage_Id;
        const dealContactEmail = dealData.contactEmail || dealData.contact_email || dealData.ContactEmail || email;
        
        if (!dealTitle) {
          console.log('[iClosed Webhook] Deal data found but no title provided, skipping deal processing');
          return res.status(200).json({ status: 'success', message: 'Webhook received' });
        }

        // Find or create contact for the deal
        let dealContact;
        if (dealContactEmail) {
          dealContact = await prisma.contact.findUnique({
            where: { email: dealContactEmail }
          });
          
          if (!dealContact && dealContactEmail !== email) {
            // Create a new contact if it doesn't exist and is different from the main contact
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

            const contactName = dealData.contactName || dealData.contact_name || dealData.ContactName;
            const { firstName, lastName } = parseName(contactName);
            
            dealContact = await prisma.contact.create({
              data: {
                firstName,
                lastName,
                email: dealContactEmail,
                phone: dealData.contactPhone || dealData.contact_phone || dealData.ContactPhone,
                userId: user.id
              }
            });
          }
        }

        // Get the first pipeline if no specific pipeline is provided
        let pipeline = await prisma.pipeline.findFirst({
          where: { userId: user.id },
          include: { stages: true }
        });

        if (!pipeline) {
          // Create a default pipeline if none exists
          const defaultPipeline = await prisma.pipeline.create({
            data: {
              name: 'Default Pipeline',
              userId: user.id
            }
          });
          
          // Create default stages for the pipeline
          const defaultStages = [
            { name: 'Lead', order: 1, pipelineId: defaultPipeline.id },
            { name: 'Qualified', order: 2, pipelineId: defaultPipeline.id },
            { name: 'Proposal', order: 3, pipelineId: defaultPipeline.id },
            { name: 'Negotiation', order: 4, pipelineId: defaultPipeline.id },
            { name: 'Closed Won', order: 5, pipelineId: defaultPipeline.id },
            { name: 'Closed Lost', order: 6, pipelineId: defaultPipeline.id }
          ];
          
          await prisma.pipelineStage.createMany({
            data: defaultStages
          });
          
          // Fetch the pipeline again with stages
          pipeline = await prisma.pipeline.findUnique({
            where: { id: defaultPipeline.id },
            include: { stages: true }
          });
        }

        // Determine the stage for the deal
        let targetStage;
        
        // First, check if there's a new_status field for lead status changes
        if (payload.event === 'lead_status_changed' && dealData.new_status) {
          // Find stage by name matching the new_status
          targetStage = pipeline.stages.find(stage => 
            stage.name.toLowerCase().includes(dealData.new_status.toLowerCase()) ||
            stage.name.toLowerCase() === dealData.new_status.toLowerCase()
          );
        }
        
        // If no stage found from new_status, check if there's a stageId
        if (!targetStage && dealStageId) {
          targetStage = pipeline.stages.find(stage => stage.id === dealStageId);
        }
        
        // If no specific stage provided or stage not found, use the first stage
        if (!targetStage) {
          targetStage = pipeline.stages[0];
        }

        // Check if deal already exists
        const existingDeal = await prisma.deal.findFirst({
          where: {
            title: dealTitle,
            pipelineId: pipeline.id,
            userId: user.id
          }
        });

        if (existingDeal) {
          // Update existing deal
          await prisma.deal.update({
            where: { id: existingDeal.id },
            data: {
              value: dealValue,
              stageId: targetStage.id,
              contactId: dealContact ? dealContact.id : null,
              userId: user.id
            }
          });
          console.log(`[iClosed Webhook] Deal updated: ${dealTitle}`);
          
          // Trigger automation workflow for pipeline stage change
          if (dealContact) {
            await triggerWorkflow('pipeline_stage_changed', dealContact.id);
          }
        } else {
          // Create new deal
          const newDeal = await prisma.deal.create({
            data: {
              title: dealTitle,
              value: dealValue,
              stageId: targetStage.id,
              pipelineId: pipeline.id,
              contactId: dealContact ? dealContact.id : null,
              userId: user.id
            }
          });
          console.log(`[iClosed Webhook] New deal created: ${dealTitle}`);
          
          // Check if this is a "call_booked" event and create activity
          if (payload.event === 'call_booked' && dealContact) {
            await prisma.activity.create({
              data: {
                type: 'APPOINTMENT_BOOKED',
                note: `Appointment booked for ${dealTitle}`,
                data: {
                  source: 'iClosed via Zapier',
                  deal_name: dealTitle,
                  booking_details: payload.booking_details || 'Details from iClosed payload'
                },
                contactId: dealContact.id,
                userId: user.id
              }
            });
            console.log(`[iClosed Webhook] 'APPOINTMENT_BOOKED' activity logged for ${email}`);
          }
          
          // Trigger automation workflow for new deal creation
          if (dealContact) {
            await triggerWorkflow('deal_created', dealContact.id);
          }
        }
      } catch (error) {
        console.error('[iClosed Webhook] Error during deal processing:', error);
      }
    }

    // Log successful webhook processing
    await logProcessedWebhook(idempotencyKey, payload, 'success');
    
    // Always return success response to Zapier
    return res.status(200).json({ status: 'success', message: 'Webhook received', idempotencyKey });
  } catch (error) {
    console.error('[iClosed Webhook] Unexpected error:', error);
    
    // Log failed webhook processing
    await logProcessedWebhook(idempotencyKey, payload, 'failed');
    
    // Still return success to prevent Zapier from retrying
    return res.status(200).json({ status: 'success', message: 'Webhook received', error: error.message });
  }
};

module.exports = {
  handleIncomingWebhook
};
