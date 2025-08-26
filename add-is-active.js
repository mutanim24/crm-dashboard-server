const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addIsActiveField() {
  try {
    // Add isActive field to integrations table
    await prisma.$executeRaw`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT true`;
    
    // Update existing Kixie integrations to be active
    await prisma.$executeRaw`UPDATE integrations SET isActive = true WHERE provider = 'kixie'`;
    
    console.log('Successfully added isActive field to integrations table');
  } catch (error) {
    console.error('Error adding isActive field:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addIsActiveField();
