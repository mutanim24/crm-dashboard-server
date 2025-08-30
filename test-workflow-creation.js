const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWorkflowCreation() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Test workflow creation
    const workflow = await prisma.automationWorkflow.create({
      data: {
        name: 'Test Workflow',
        definition: {
          nodes: [
            { id: '1', type: 'trigger', data: { label: 'When a new contact is created' } },
            { id: '2', type: 'action', data: { label: 'Send welcome email' } }
          ],
          edges: [
            { id: 'e1-2', source: '1', target: '2' }
          ]
        },
        userId: 'cmeydbdi70000vqfc0ijg6sbt'
      }
    });
    
    console.log('Workflow created successfully:', workflow);
    
    // Test fetching workflows
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

testWorkflowCreation();
