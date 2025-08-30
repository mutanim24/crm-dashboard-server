const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkflows() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    
    const workflows = await prisma.automationWorkflow.findMany({
      where: {
        userId: 'cmeydbdi70000vqfc0ijg6sbt'
      }
    });
    
    console.log('Found workflows:', workflows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkflows();
