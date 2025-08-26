const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Find the first user in the database
  const firstUser = await prisma.user.findFirst();
  
  if (!firstUser) {
    console.error('No user found in the database. Please create a user first.');
    return;
  }
  
  console.log(`Using user: ${firstUser.email} (${firstUser.firstName} ${firstUser.lastName})`);

  // Check if user has any pipelines
  const existingPipelines = await prisma.pipeline.findMany({
    where: { userId: firstUser.id },
  });

  if (existingPipelines.length === 0) {
    // Create a new Pipeline for that user
    const pipeline = await prisma.pipeline.create({
      data: {
        name: 'Main Sales Pipeline',
        description: 'Default sales pipeline for tracking deals',
        userId: firstUser.id,
        stages: {
          create: [
            {
              name: 'New Lead',
              order: 0,
            },
            {
              name: 'Contact Made',
              order: 1,
            },
            {
              name: 'Proposal Sent',
              order: 2,
            },
            {
              name: 'Negotiation',
              order: 3,
            },
          ],
        },
      },
      include: {
        stages: true,
      },
    });

    console.log(`Pipeline created with ID: ${pipeline.id}`);

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

    // Create one sample Deal and place it in the "New Lead" stage
    const newLeadStage = pipeline.stages.find(stage => stage.name === 'New Lead');
    
    if (newLeadStage) {
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
    console.log('User already has pipelines, skipping pipeline creation');
    
    // If pipelines exist but no stages, let's add stages to the first pipeline
    const firstPipeline = existingPipelines[0];
    const existingStages = await prisma.pipelineStage.findMany({
      where: { pipelineId: firstPipeline.id },
    });
    
    if (existingStages.length === 0) {
      console.log('Adding stages to existing pipeline...');
      
      const stages = await prisma.pipelineStage.createMany({
        data: [
          {
            name: 'New Lead',
            order: 0,
            pipelineId: firstPipeline.id,
          },
          {
            name: 'Contact Made',
            order: 1,
            pipelineId: firstPipeline.id,
          },
          {
            name: 'Proposal Sent',
            order: 2,
            pipelineId: firstPipeline.id,
          },
          {
            name: 'Negotiation',
            order: 3,
            pipelineId: firstPipeline.id,
          },
        ],
      });
      
      console.log(`Added ${stages.count} stages to pipeline ${firstPipeline.id}`);
      
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
          pipelineId: firstPipeline.id,
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
            pipelineId: firstPipeline.id,
            contactId: contact.id,
            userId: firstUser.id,
          },
        });

        console.log('Sample deal created in "New Lead" stage');
      } else {
        console.error('New Lead stage not found');
      }
    } else {
      console.log('Pipeline already has stages, skipping stage creation');
    }
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
