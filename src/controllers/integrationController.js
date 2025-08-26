const { prisma } = require('../services/db');
const { encrypt, decrypt } = require('../utils/crypto');
const httpClient = require('../utils/httpClient');

/**
 * Upserts Kixie API credentials for the authenticated user
 * @route POST /api/v1/integrations/kixie
 * @desc Save or update Kixie API credentials
 * @access Private
 */
const upsertKixieCredentials = async (req, res) => {
  try {
    // Add diagnostic logging
    console.log('Kixie credentials request received:', {
      user: req.user,
      body: req.body,
      headers: req.headers
    });
    
    // Extract businessId, apiKey, and isActive from request body
    const { businessId, apiKey, isActive = true } = req.body;

    // Validate required fields
    if (!businessId || !apiKey) {
      console.error('Kixie credentials failed: Missing required fields', {
        businessId: businessId ? 'present' : 'missing',
        apiKey: apiKey ? 'present' : 'missing'
      });
      return res.status(400).json({ 
        error: 'Both businessId and apiKey are required',
        receivedData: req.body
      });
    }
    
    console.log('Processing Kixie credentials for businessId:', businessId);

    // Encrypt the credentials
    const encryptedBusinessId = encrypt(businessId);
    const encryptedApiKey = encrypt(apiKey);

    // Create a dataToSave object for the Prisma query
    const dataToSave = {
      encryptedBusinessId: encryptedBusinessId,
      encryptedApiKey: encryptedApiKey
    };
    
    // Add isActive to the data to save
    dataToSave.isActive = isActive;
    
    // Add diagnostic logging
    console.log('Data to be saved:', dataToSave);

    // Upsert the integration using the composite unique key
    const integration = await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: req.user.id,
          provider: 'kixie'
        }
      },
      update: {
        credentials: dataToSave,
        isActive: true
      },
      create: {
        provider: 'kixie',
        userId: req.user.id,
        credentials: dataToSave,
        isActive: true
      },
      select: {
        id: true,
        provider: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'integration_updated',
        note: `Updated Kixie integration credentials`,
        userId: req.user.id,
      },
    });

    // Respond with success message (do not return encrypted credentials)
    res.status(200).json({
      success: true,
      message: 'Kixie credentials saved successfully',
      data: {
        id: integration.id,
        provider: integration.provider,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      }
    });

  } catch (error) {
    console.error('Error saving Kixie credentials:', error);
    res.status(500).json({ 
      error: 'Failed to save Kixie credentials' 
    });
  }
};

/**
 * Initiates a call using Kixie API credentials for the authenticated user
 * @route POST /api/v1/integrations/kixie/call
 * @desc Initiate a call via Kixie API
 * @access Private
 */
const initiateCall = async (req, res) => {
  try {
    // Add diagnostic logging
    console.log('Kixie call request received:', {
      user: req.user,
      body: req.body,
      headers: req.headers
    });
    
    // Extract phoneNumber from request body
    const { phoneNumber } = req.body;

    // Validate phoneNumber
    if (!phoneNumber) {
      console.error('Kixie call failed: Phone number is missing in request body');
      return res.status(400).json({ 
        message: 'Phone number is required',
        receivedData: req.body
      });
    }
    
    console.log('Processing Kixie call for phone number:', phoneNumber);

    // Retrieve the encrypted Kixie credentials for the currently authenticated user
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: req.user.id,
          provider: 'kixie'
        }
      }
    });
    
    // Add diagnostic logging
    console.log('credentials:', integration);

    // Add a "Credentials Not Found" Guard Clause
    if (!integration) {
      return res.status(400).json({ 
        message: "Kixie integration not configured for this user." 
      });
    }
    
    // Check if integration is active
    if (!integration.isActive) {
      return res.status(400).json({ 
        message: "Kixie integration is disabled for this user. Please enable it in your settings." 
      });
    }
    
    // Add a check for null credentials
    if (!integration.credentials) {
      return res.status(400).json({ 
        message: "Kixie credentials not found for this user." 
      });
    }
    
    // Add robust validation for encrypted credentials
    if (!integration.credentials.encryptedBusinessId || !integration.credentials.encryptedApiKey) {
      return res.status(400).json({ 
        message: "Incomplete Kixie credentials found for this user." 
      });
    }

    let decryptedBusinessId, decryptedApiKey;

    // Implement Robust Decryption
    try {
      decryptedBusinessId = decrypt(integration.credentials.encryptedBusinessId);
      decryptedApiKey = decrypt(integration.credentials.encryptedApiKey);
    } catch (decryptError) {
      console.error('Error decrypting Kixie credentials:', decryptError);
      return res.status(500).json({ 
        message: "Failed to process credentials." 
      });
    }

    // Implement Robust External API Call
    try {
      // Use the httpClient to make a POST request to the official Kixie API endpoint
      const kixieResponse = await httpClient.post('https://apig.kixie.com/app/event', {
        event_name: 'start_call',
        business_id: decryptedBusinessId,
        api_key: decryptedApiKey,
        phone_number: phoneNumber
      });

      // Return a Clear Success Response
      res.status(200).json({
        success: true,
        message: 'Call initiated successfully',
        data: kixieResponse.data
      });
    } catch (apiError) {
      console.error('Error calling Kixie API:', apiError);
      
      // Handle specific error cases from the Kixie API
      if (apiError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Kixie API error response:', apiError.response.data);
        
        // Provide more user-friendly error messages for common Kixie API errors
        if (apiError.response.status === 403) {
          const errorMessage = apiError.response.data?.message || 'Invalid Kixie API credentials. Please check your API key and ensure it is enabled.';
          res.status(400).json({
            message: errorMessage,
            details: 'Please verify your Kixie API credentials in your settings. If the credentials are correct, you may need to contact Kixie support to enable your API key.'
          });
        } else {
          res.status(apiError.response.status || 500).json({
            message: 'Kixie API error',
            details: apiError.response.data
          });
        }
      } else if (apiError.request) {
        // The request was made but no response was received
        console.error('Kixie API no response:', apiError.message);
        res.status(500).json({
          message: 'Failed to reach Kixie API',
          details: apiError.message
        });
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Kixie API setup error:', apiError.message);
        res.status(500).json({
          message: 'Failed to initiate call',
          details: apiError.message
        });
      }
    }
  } catch (error) {
    // Catch any other unexpected errors
    console.error('Unexpected error in initiateCall:', error);
    res.status(500).json({
      message: 'An unexpected error occurred while initiating the call.'
    });
  }
};

/**
 * Sends an SMS using Kixie API credentials for the authenticated user
 * @route POST /api/v1/integrations/kixie/sms
 * @desc Send an SMS via Kixie API
 * @access Private
 */
const sendSms = async (req, res) => {
  try {
    // Add diagnostic logging
    console.log('Kixie SMS request received:', {
      user: req.user,
      body: req.body,
      headers: req.headers
    });
    
    // Extract phoneNumber and message from request body
    const { phoneNumber, message } = req.body;

    // Validate phoneNumber and message
    if (!phoneNumber || !message) {
      console.error('Kixie SMS failed: Missing required fields', {
        phoneNumber: phoneNumber ? 'present' : 'missing',
        message: message ? 'present' : 'missing'
      });
      return res.status(400).json({ 
        message: 'Phone number and message are required',
        receivedData: req.body
      });
    }
    
    console.log('Processing Kixie SMS for phone number:', phoneNumber, 'with message:', message);

    // Retrieve the encrypted Kixie credentials for the currently authenticated user
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: req.user.id,
          provider: 'kixie'
        }
      }
    });

    // Add a "Credentials Not Found" Guard Clause
    if (!integration) {
      return res.status(400).json({ 
        message: "Kixie integration not configured for this user." 
      });
    }
    
    // Check if integration is active
    if (!integration.isActive) {
      return res.status(400).json({ 
        message: "Kixie integration is disabled for this user. Please enable it in your settings." 
      });
    }
    
    // Add a check for null credentials
    if (!integration.credentials) {
      return res.status(400).json({ 
        message: "Kixie credentials not found for this user." 
      });
    }
    
    // Add robust validation for encrypted credentials
    if (!integration.credentials.encryptedBusinessId || !integration.credentials.encryptedApiKey) {
      return res.status(400).json({ 
        message: "Incomplete Kixie credentials found for this user." 
      });
    }

    let decryptedBusinessId, decryptedApiKey;

    // Implement Robust Decryption
    try {
      decryptedBusinessId = decrypt(integration.credentials.encryptedBusinessId);
      decryptedApiKey = decrypt(integration.credentials.encryptedApiKey);
    } catch (decryptError) {
      console.error('Error decrypting Kixie credentials:', decryptError);
      return res.status(500).json({ 
        message: "Failed to process credentials." 
      });
    }

    // Implement Robust External API Call
    try {
      // Use the httpClient to make a POST request to the official Kixie API endpoint
      const kixieResponse = await httpClient.post('https://apig.kixie.com/app/event', {
        event_name: 'send_sms',
        business_id: decryptedBusinessId,
        api_key: decryptedApiKey,
        phone_number: phoneNumber,
        message: message
      });

      // Return a Clear Success Response
      res.status(200).json({
        success: true,
        message: 'SMS sent successfully',
        data: kixieResponse.data
      });
    } catch (apiError) {
      console.error('Error calling Kixie API:', apiError);
      
      // Handle specific error cases from the Kixie API
      if (apiError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Kixie API error response:', apiError.response.data);
        
        // Provide more user-friendly error messages for common Kixie API errors
        if (apiError.response.status === 403) {
          const errorMessage = apiError.response.data?.message || 'Invalid Kixie API credentials. Please check your API key and ensure it is enabled.';
          res.status(400).json({
            message: errorMessage,
            details: 'Please verify your Kixie API credentials in your settings. If the credentials are correct, you may need to contact Kixie support to enable your API key.'
          });
        } else {
          res.status(apiError.response.status || 500).json({
            message: 'Kixie API error',
            details: apiError.response.data
          });
        }
      } else if (apiError.request) {
        // The request was made but no response was received
        console.error('Kixie API no response:', apiError.message);
        res.status(500).json({
          message: 'Failed to reach Kixie API',
          details: apiError.message
        });
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Kixie API setup error:', apiError.message);
        res.status(500).json({
          message: 'Failed to send SMS',
          details: apiError.message
        });
      }
    }
  } catch (error) {
    // Catch any other unexpected errors
    console.error('Unexpected error in sendSms:', error);
    res.status(500).json({
      message: 'An unexpected error occurred while sending the SMS.'
    });
  }
};

/**
 * Handles incoming webhook events from Kixie
 * @route POST /api/v1/integrations/kixie/webhook
 * @desc Receive webhook events from Kixie, parse data, and create an Activity record.
 * @access Public
 */
const handleKixieWebhook = async (req, res) => {
  try {
    // Log the entire incoming payload
    console.log('--- KIXIE WEBHOOK RECEIVED ---');
    console.log(JSON.stringify(req.body, null, 2));

    // --- Step 1: Identify the User ---
    // Assuming the webhook payload contains a field like 'user_id' or 'user_email'
    // Adjust the field name based on the actual Kixie webhook structure.
    // For this example, let's assume 'user_id' is present in the payload.
    const kixieUserId = req.body.user_id; // Or req.body.user_email, etc.

    if (!kixieUserId) {
      console.error('Kixie webhook: user_id not found in payload.');
      // Respond with 200 OK to prevent Kixie from retrying, but log the error.
      return res.status(200).send('OK');
    }

    let user;
    try {
      // Attempt to find the user by ID. If Kixie sends an email, use req.body.user_email instead.
      user = await prisma.user.findUnique({
        where: { id: kixieUserId },
      });
    } catch (dbError) {
      console.error('Database error finding user by ID:', dbError);
      // Respond with 200 OK to prevent Kixie from retrying.
      return res.status(200).send('OK');
    }

    if (!user) {
      console.error(`Kixie webhook: User with ID ${kixieUserId} not found.`);
      // Respond with 200 OK to prevent Kixie from retrying.
      return res.status(200).send('OK');
    }

    // --- Step 2: Identify the Contact ---
    // Assuming the webhook payload contains the contact's phone number.
    // Common field names might be 'caller_number', 'callee_number', 'phone_number', etc.
    const contactPhoneNumber = req.body.caller_number || req.body.phone_number; // Adjust as needed

    let contact = null;
    if (contactPhoneNumber) {
      try {
        contact = await prisma.contact.findFirst({
          where: {
            phone: contactPhoneNumber,
            userId: user.id, // Ensure contact belongs to the found user
          },
        });
      } catch (dbError) {
        console.error('Database error finding contact:', dbError);
        // Continue without a contact, but log the error.
      }
    }

    // --- Step 3: Create the Activity Record ---
    const eventType = req.body.event_name; // e.g., 'call_ended', 'sms_received'
    let activityType = 'kixie_event'; // Default type
    let note = `Kixie event: ${eventType}`; // Default note

    // Construct a more descriptive note based on event type and payload
    if (eventType === 'call_ended') {
      const duration = req.body.duration ? `${req.body.duration} seconds` : 'unknown duration';
      const direction = req.body.direction || 'unknown direction';
      const otherParty = contactPhoneNumber || req.body.callee_number || 'unknown party';
      activityType = 'kixie_call_ended';
      note = `${direction} call to ${otherParty} ended. Duration: ${duration}.`;
    } else if (eventType === 'sms_received') {
      const fromNumber = req.body.from_number || contactPhoneNumber || 'unknown number';
      const smsContent = req.body.message ? `Message: "${req.body.message}"` : 'No message content';
      activityType = 'kixie_sms_received';
      note = `SMS received from ${fromNumber}. ${smsContent}`;
    } else if (eventType === 'sms_sent') {
      const toNumber = req.body.to_number || contactPhoneNumber || 'unknown number';
      const smsContent = req.body.message ? `Message: "${req.body.message}"` : 'No message content';
      activityType = 'kixie_sms_sent';
      note = `SMS sent to ${toNumber}. ${smsContent}`;
    }
    // Add more event types as needed

    try {
      await prisma.activity.create({
        data: {
          type: activityType,
          note: note,
          userId: user.id,
          contactId: contact ? contact.id : null,
          data: req.body, // Store the entire webhook payload
        },
      });
      console.log(`Successfully created activity: ${activityType} for user ${user.id}`);
    } catch (dbError) {
      console.error('Database error creating activity:', dbError);
      // Respond with 200 OK to prevent Kixie from retrying.
      // The activity creation failed, but we don't want to cause the webhook to be resent.
    }

    // Send an immediate success response
    res.status(200).send('OK');
  } catch (error) {
    console.error('Unexpected error handling Kixie webhook:', error);
    // Still respond with 200 to prevent Kixie from retrying
    res.status(200).send('OK');
  }
};

/**
 * Toggles the active status of Kixie integration for the authenticated user
 * @route POST /api/v1/integrations/kixie/toggle
 * @desc Toggle Kixie integration status
 * @access Private
 */
const toggleKixieIntegration = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ 
        message: 'isActive must be a boolean value' 
      });
    }
    
    // Find the user's Kixie integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: req.user.id,
          provider: 'kixie'
        }
      }
    });
    
    if (!integration) {
      return res.status(400).json({ 
        message: "Kixie integration not configured for this user." 
      });
    }
    
    // Update the integration status
    const updatedIntegration = await prisma.integration.update({
      where: { id: integration.id },
      data: { isActive }
    });
    
    // Log activity
    await prisma.activity.create({
      data: {
        type: 'integration_updated',
        note: `Kixie integration ${isActive ? 'enabled' : 'disabled'}`,
        userId: req.user.id,
      },
    });
    
    res.status(200).json({
      success: true,
      message: `Kixie integration ${isActive ? 'enabled' : 'disabled'} successfully`,
      data: {
        id: updatedIntegration.id,
        isActive: updatedIntegration.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling Kixie integration:', error);
    res.status(500).json({
      message: 'An unexpected error occurred while toggling the integration.'
    });
  }
};

module.exports = {
  upsertKixieCredentials,
  initiateCall,
  sendSms,
  handleKixieWebhook,
  toggleKixieIntegration
};
