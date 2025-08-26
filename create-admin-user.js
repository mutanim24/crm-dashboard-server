const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin user...');
  
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@crm.com' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@crm.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      },
    });
    
    console.log(`Admin user created with email: ${adminUser.email}`);
    
    // Create a pipeline for the admin user
    const pipeline = await prisma.pipeline.create({
      data: {
        name: 'Main Sales Pipeline',
        description: 'Default sales pipeline for tracking deals',
        userId: adminUser.id,
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
        userId: adminUser.id,
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
          userId: adminUser.id,
        },
      });

      console.log('Sample deal created in "New Lead" stage');
    } else {
      console.error('New Lead stage not found');
    }
    
    console.log('Admin user and pipeline created successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Database disconnected');
  }
}

main();
