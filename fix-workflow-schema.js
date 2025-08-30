const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWorkflowSchema() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Check if the trigger column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'automation_workflows' 
      AND column_name = 'trigger'
    `;
    
    if (result.length > 0) {
      console.log('Column "trigger" exists, dropping it...');
      
      // Drop the trigger column
      await prisma.$executeRaw`
        ALTER TABLE "automation_workflows" 
        DROP COLUMN "trigger"
      `;
      
      console.log('Column "trigger" dropped successfully');
    } else {
      console.log('Column "trigger" does not exist');
    }
    
    // Check if the actions column exists
    const actionsResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'automation_workflows' 
      AND column_name = 'actions'
    `;
    
    if (actionsResult.length > 0) {
      console.log('Column "actions" exists, dropping it...');
      
      // Drop the actions column
      await prisma.$executeRaw`
        ALTER TABLE "automation_workflows" 
        DROP COLUMN "actions"
      `;
      
      console.log('Column "actions" dropped successfully');
    } else {
      console.log('Column "actions" does not exist');
    }
    
    // Check if the definition column exists
    const definitionResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'automation_workflows' 
      AND column_name = 'definition'
    `;
    
    if (definitionResult.length === 0) {
      console.log('Column "definition" does not exist, adding it...');
      
      // Add the definition column
      await prisma.$executeRaw`
        ALTER TABLE "automation_workflows" 
        ADD COLUMN "definition" JSONB
      `;
      
      console.log('Column "definition" added successfully');
    } else {
      console.log('Column "definition" already exists');
    }
    
    // Test workflow creation
    const testWorkflow = {
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
    };
    
    const workflow = await prisma.automationWorkflow.create({
      data: testWorkflow
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

fixWorkflowSchema();
