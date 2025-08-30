const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding profile fields to User table...');
  
  try {
    // Add the new columns to the User table
    await prisma.$executeRaw`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "company" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "jobTitle" VARCHAR(255);
    `;
    
    console.log('Profile fields added successfully!');
  } catch (error) {
    console.error('Error adding profile fields:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
