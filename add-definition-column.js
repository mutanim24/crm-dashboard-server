const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addDefinitionColumn() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Check if the column already exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'automation_workflows' 
      AND column_name = 'definition'
    `;
    
    if (result.length > 0) {
      console.log('Column "definition" already exists');
      return;
    }
    
    // Add the definition column
    await prisma.$executeRaw`
      ALTER TABLE "automation_workflows" 
      ADD COLUMN "definition" JSONB
    `;
    
    console.log('Column "definition" added successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefinitionColumn();
