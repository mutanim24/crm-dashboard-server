const { PrismaClient } = require('@prisma/client');
const crypto = require('../utils/crypto');

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Function to connect to the database
const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

// Function to disconnect from the database
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Failed to disconnect from database:', error);
    throw error;
  }
};

// Middleware to decrypt credentials before query execution
prisma.$use(async (params, next) => {
  // Only process Integration model operations
  if (params.model === 'Integration') {
    // If the operation involves credentials data (create, update)
    if (params.args.data?.credentials) {
      try {
        // Decrypt credentials before saving
        const decryptedCredentials = await crypto.decrypt(
          params.args.data.credentials
        );
        params.args.data.credentials = decryptedCredentials;
      } catch (error) {
        console.error('Error decrypting credentials:', error);
        throw new Error('Failed to decrypt credentials');
      }
    }

    // Execute the query first
    const result = await next(params);

    // If the operation is a find query, encrypt credentials in the result
    if (
      params.action === 'findUnique' || 
      params.action === 'findMany' ||
      params.action === 'findFirst'
    ) {
      if (result && Array.isArray(result)) {
        // For findMany and similar array results
        for (const item of result) {
          if (item.credentials) {
            try {
              item.credentials = await crypto.encrypt(JSON.stringify(item.credentials));
            } catch (error) {
              console.error('Error encrypting credentials:', error);
            }
          }
        }
      } else if (result && result.credentials) {
        // For findUnique and findFirst
        try {
          result.credentials = await crypto.encrypt(JSON.stringify(result.credentials));
        } catch (error) {
          console.error('Error encrypting credentials:', error);
        }
      }
    }

    return result;
  }

  // For all other models, just pass through
  return next(params);
});

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};
