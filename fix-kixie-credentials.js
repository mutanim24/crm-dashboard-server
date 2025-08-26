const { PrismaClient } = require('@prisma/client');
const { encrypt } = require('./src/utils/crypto');

const prisma = new PrismaClient();

async function fixKixieCredentials() {
  try {
    console.log('Starting Kixie credentials fix...');
    
    // Find all Kixie integrations
    const kixieIntegrations = await prisma.integration.findMany({
      where: { provider: 'kixie' }
    });
    
    console.log(`Found ${kixieIntegrations.length} Kixie integrations`);
    
    for (const integration of kixieIntegrations) {
      console.log(`Processing integration for user ${integration.userId}`);
      
      // Check if credentials are in the old format (single JSON string)
      if (integration.credentials && typeof integration.credentials === 'string') {
        try {
          // Parse the old credentials
          const oldCredentials = JSON.parse(integration.credentials);
          
          // Check if it has the expected structure
          if (oldCredentials.businessId && oldCredentials.apiKey) {
            console.log(`Found old format credentials for user ${integration.userId}`);
            
            // Encrypt the credentials separately
            const encryptedBusinessId = encrypt(oldCredentials.businessId);
            const encryptedApiKey = encrypt(oldCredentials.apiKey);
            
            // Update the integration with the new format
            await prisma.integration.update({
              where: { id: integration.id },
              data: {
                credentials: {
                  encryptedBusinessId,
                  encryptedApiKey,
                  isActive: integration.isActive || true
                }
              }
            });
            
            console.log(`Fixed credentials for user ${integration.userId}`);
          } else {
            console.log(`Credentials for user ${integration.userId} don't have expected structure`);
          }
        } catch (error) {
          console.error(`Error parsing credentials for user ${integration.userId}:`, error);
        }
      } else if (integration.credentials && 
                 (!integration.credentials.encryptedBusinessId || 
                  !integration.credentials.encryptedApiKey)) {
        console.log(`Credentials for user ${integration.userId} are in an incomplete format`);
        
        // If credentials exist but don't have the expected structure, we'll need to 
        // ask the user to re-enter them
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            isActive: false
          }
        });
        
        console.log(`Disabled integration for user ${integration.userId} due to incomplete credentials`);
      } else {
        console.log(`Credentials for user ${integration.userId} are already in the correct format`);
      }
    }
    
    console.log('Kixie credentials fix completed successfully!');
  } catch (error) {
    console.error('Error fixing Kixie credentials:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixKixieCredentials();
