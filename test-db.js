const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Testing database connection...');
  
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Check if any users exist
    const users = await prisma.user.findMany();
    console.log('Total users in database:', users.length);
    
    if (users.length > 0) {
      console.log('Users found:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.firstName} ${user.lastName}`);
      });
      
      // Use the first user for pipeline testing
      const firstUser = users[0];
      console.log('\nUsing first user for pipeline testing:', firstUser);
      
      // Check all pipelines for this user
      const pipelines = await prisma.pipeline.findMany({
        where: { userId: firstUser.id },
        include: {
          stages: {
            include: {
              deals: {
                include: {
                  contact: true,
                },
              },
            },
          },
        },
      });
      
      console.log('\nAll pipelines for user:', pipelines.length);
      
      if (pipelines.length > 0) {
        pipelines.forEach((pipeline, index) => {
          console.log(`\nPipeline ${index + 1}:`);
          console.log(`ID: ${pipeline.id}`);
          console.log(`Name: ${pipeline.name}`);
          console.log(`Stages: ${pipeline.stages.length}`);
          
          if (pipeline.stages.length > 0) {
            console.log('Sample stage data:');
            console.log(JSON.stringify(pipeline.stages[0], null, 2));
            
            if (pipeline.stages[0].deals.length > 0) {
              console.log('Sample deal data:');
              console.log(JSON.stringify(pipeline.stages[0].deals[0], null, 2));
            } else {
              console.log('No deals found in this stage');
            }
          } else {
            console.log('No stages found in this pipeline');
          }
        });
      } else {
        console.log('No pipelines found for user');
      }
    } else {
      console.log('No users found in the database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Database disconnected');
  }
}

main();
