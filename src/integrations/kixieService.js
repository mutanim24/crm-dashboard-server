const { prisma } = require('../services/db');
const { decrypt } = require('../utils/crypto');
const httpClient = require('../utils/httpClient');

/**
 * Makes a call using Kixie API
 * @param {string} phone - Phone number to call
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - API response
 */
const makeCall = async (phone, userId) => {
  try {
    // Get user's Kixie integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId,
        provider: 'kixie',
        isActive: true,
      },
    });

    if (!integration) {
      throw new Error('Kixie integration not found');
    }
    
    // Add a check for null credentials
    if (!integration.credentials) {
      throw new Error('Kixie credentials not found for this user.');
    }
    
    // Add robust validation for encrypted credentials
    if (!integration.credentials.encryptedBusinessId || !integration.credentials.encryptedApiKey) {
      throw new Error('Incomplete Kixie credentials found for this user.');
    }

    let decryptedBusinessId, decryptedApiKey;

    // Implement Robust Decryption
    try {
      decryptedBusinessId = decrypt(integration.credentials.encryptedBusinessId);
      decryptedApiKey = decrypt(integration.credentials.encryptedApiKey);
    } catch (decryptError) {
      console.error('Error decrypting Kixie credentials:', decryptError);
      throw new Error('Failed to process credentials.');
    }

    // Make API call to Kixie using the same endpoint as the controller
    const response = await httpClient.post('https://apig.kixie.com/app/event', {
      event_name: 'start_call',
      business_id: decryptedBusinessId,
      api_key: decryptedApiKey,
      phone_number: phone
    });

    return response.data;
  } catch (error) {
    console.error('Error making Kixie call:', error);
    throw error;
  }
};

/**
 * Sends SMS using Kixie API
 * @param {string} phone - Phone number to send SMS to
 * @param {string} message - SMS message content
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - API response
 */
const sendSMS = async (phone, message, userId) => {
  try {
    // Get user's Kixie integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId,
        provider: 'kixie',
        isActive: true,
      },
    });

    if (!integration) {
      throw new Error('Kixie integration not found');
    }
    
    // Add a check for null credentials
    if (!integration.credentials) {
      throw new Error('Kixie credentials not found for this user.');
    }
    
    // Add robust validation for encrypted credentials
    if (!integration.credentials.encryptedBusinessId || !integration.credentials.encryptedApiKey) {
      throw new Error('Incomplete Kixie credentials found for this user.');
    }

    let decryptedBusinessId, decryptedApiKey;

    // Implement Robust Decryption
    try {
      decryptedBusinessId = decrypt(integration.credentials.encryptedBusinessId);
      decryptedApiKey = decrypt(integration.credentials.encryptedApiKey);
    } catch (decryptError) {
      console.error('Error decrypting Kixie credentials:', decryptError);
      throw new Error('Failed to process credentials.');
    }

    // Make API call to Kixie using the same endpoint as the controller
    const response = await httpClient.post('https://apig.kixie.com/app/event', {
      event_name: 'send_sms',
      business_id: decryptedBusinessId,
      api_key: decryptedApiKey,
      phone_number: phone,
      message: message
    });

    return response.data;
  } catch (error) {
    console.error('Error sending SMS through Kixie:', error);
    throw error;
  }
};

/**
 * Gets call logs from Kixie
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters (date range, etc.)
 * @returns {Promise<Array>} - Array of call logs
 */
const getCallLogs = async (userId, filters = {}) => {
  try {
    // Get user's Kixie integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId,
        provider: 'kixie',
        isActive: true,
      },
    });

    if (!integration) {
      throw new Error('Kixie integration not found');
    }
    
    // Add a check for null credentials
    if (!integration.credentials) {
      throw new Error('Kixie credentials not found for this user.');
    }
    
    // Add robust validation for encrypted credentials
    if (!integration.credentials.encryptedBusinessId || !integration.credentials.encryptedApiKey) {
      throw new Error('Incomplete Kixie credentials found for this user.');
    }

    let decryptedBusinessId, decryptedApiKey;

    // Implement Robust Decryption
    try {
      decryptedBusinessId = decrypt(integration.credentials.encryptedBusinessId);
      decryptedApiKey = decrypt(integration.credentials.encryptedApiKey);
    } catch (decryptError) {
      console.error('Error decrypting Kixie credentials:', decryptError);
      throw new Error('Failed to process credentials.');
    }

    // Make API call to Kixie using the same endpoint as the controller
    const response = await httpClient.post('https://apig.kixie.com/app/event', {
      event_name: 'get_call_logs',
      business_id: decryptedBusinessId,
      api_key: decryptedApiKey,
      ...filters
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching Kixie call logs:', error);
    throw error;
  }
};

module.exports = {
  makeCall,
  sendSMS,
  getCallLogs,
};
