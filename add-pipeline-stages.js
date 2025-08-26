const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Adding pipeline stages...');
  
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Find the first user in the database
    const firstUser = await prisma.user.findFirst();
    
    if (!firstUser) {
      console.error('No user found in the database');
      return;
    }
    
    console.log(`Using user: ${firstUser.email}`);
    
    // Get all pipelines for this user
    const pipelines = await prisma.pipeline.findMany({
      where: { userId: firstUser.id },
    });
    
    console.log(`Found ${pipelines.length} pipelines`);
    
    for (const pipeline of pipelines) {
      // Check if pipeline already has stages
      const existingStages = await prisma.pipelineStage.findMany({
        where: { pipelineId: pipeline.id },
      });
      
      if (existingStages.length === 0) {
        console.log(`Adding stages to pipeline: ${pipeline.name}`);
        
        // Create stages for this pipeline
        const stages = await prisma.pipelineStage.createMany({
          data: [
            {
              name: 'New Lead',
              order: 0,
              pipelineId: pipeline.id,
            },
            {
              name: 'Contact Made',
              order: 1,
              pipelineId: pipeline.id,
            },
            {
              name: 'Proposal Sent',
              order: 2,
              pipelineId: pipeline.id,
            },
            {
              name: 'Negotiation',
              order: 3,
              pipelineId: pipeline.id,
            },
          ],
        });
        
        console.log(`Added ${stages.count} stages to pipeline ${pipeline.id}`);
        
        // Create a sample contact for the deal
        const contact = await prisma.contact.create({
          data: {
            firstName: 'ACME',
            lastName: 'Corporation',
            email: 'contact@acme.com',
            phone: '+1 (555) 123-4567',
            company: 'ACME Corporation',
            userId: firstUser.id,
          },
        });

        console.log(`Contact created with ID: ${contact.id}`);
        
        // Get the "New Lead" stage
        const newLeadStage = await prisma.pipelineStage.findFirst({
          where: { 
            pipelineId: pipeline.id,
            name: 'New Lead'
          },
        });
        
        if (newLeadStage) {
          // Create one sample Deal and place it in the "New Lead" stage
          await prisma.deal.create({
            data: {
              title: 'First Deal for ACME Corp',
              value: 5000,
              currency: 'USD',
              stageId: newLeadStage.id,
              pipelineId: pipeline.id,
              contactId: contact.id,
              userId: firstUser.id,
            },
          });

          console.log('Sample deal created in "New Lead" stage');
        } else {
          console.error('New Lead stage not found');
        }
      } else {
        console.log(`Pipeline ${pipeline.name} already has ${existingStages.length} stages, skipping`);
      }
    }
    
    console.log('Pipeline stages added successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Database disconnected');
  }
}

main();
