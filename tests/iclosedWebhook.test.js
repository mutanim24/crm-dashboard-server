const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/services/db');

describe('iClosed Webhook Endpoints', () => {
  // Test user for associating contacts and deals
  let testUser;

  beforeAll(async () => {
    // Clean up database before all tests
    await prisma.activity.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.pipeline.deleteMany();
    await prisma.pipelineStage.deleteMany();
    await prisma.user.deleteMany();

    // Create a test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    // Create a default pipeline with stages for testing
    const pipeline = await prisma.pipeline.create({
      data: {
        name: 'Test Pipeline',
        userId: testUser.id,
      },
    });

    // Create pipeline stages
    const stages = [
      { name: 'Booked Call', order: 1, pipelineId: pipeline.id },
      { name: 'Proposal Sent', order: 2, pipelineId: pipeline.id },
      { name: 'Negotiation', order: 3, pipelineId: pipeline.id },
      { name: 'Closed Won', order: 4, pipelineId: pipeline.id },
    ];

    await prisma.pipelineStage.createMany({
      data: stages,
    });
  });

  afterAll(async () => {
    // Clean up database after all tests
    await prisma.activity.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.pipeline.deleteMany();
    await prisma.pipelineStage.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Test Suite 1: "call_booked" Event', () => {
    beforeEach(async () => {
      // Clean up specific data before each test
      await prisma.activity.deleteMany();
      await prisma.deal.deleteMany();
      await prisma.contact.deleteMany({
        where: { email: 'new.user@test.com' },
      });
    });

    it('should create a new contact, a new deal, and an activity log when a "call_booked" event is received for a new contact', async () => {
      // Arrange: Prepare a JSON payload for a new contact
      const payload = {
        event: 'call_booked',
        contact: {
          email: 'new.user@test.com',
          name: 'New User',
          phone: '1234567890',
        },
        deal: {
          title: 'New Deal - Website Design',
          value: 5000,
          contactEmail: 'new.user@test.com',
          contactName: 'New User',
        },
        booking_details: {
          date: '2023-12-15',
          time: '14:00',
          duration: 60,
        },
      };

      // Act: Use supertest to send a POST request with this payload to the webhook endpoint
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .send(payload);

      // Assert: Check the HTTP response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');

      // Query the database to confirm a Contact with the new email now exists
      const createdContact = await prisma.contact.findUnique({
        where: { email: 'new.user@test.com' },
      });
      expect(createdContact).toBeTruthy();
      expect(createdContact.firstName).toBe('New');
      expect(createdContact.lastName).toBe('User');
      expect(createdContact.email).toBe('new.user@test.com');
      expect(createdContact.phone).toBe('1234567890');

      // Query the database to confirm a Deal associated with the new contact's ID now exists in the "Booked Call" stage
      const createdDeal = await prisma.deal.findFirst({
        where: { title: 'New Deal - Website Design' },
        include: { stage: true },
      });
      expect(createdDeal).toBeTruthy();
      expect(createdDeal.title).toBe('New Deal - Website Design');
      expect(createdDeal.value).toBe(5000);
      expect(createdDeal.stage.name).toBe('Booked Call');
      expect(createdDeal.contactId).toBe(createdContact.id);

      // Query the database to confirm an Activity with type 'APPOINTMENT_BOOKED' associated with the contact's ID now exists
      const createdActivity = await prisma.activity.findFirst({
        where: { 
          type: 'APPOINTMENT_BOOKED',
          contactId: createdContact.id,
        },
      });
      expect(createdActivity).toBeTruthy();
      expect(createdActivity.type).toBe('APPOINTMENT_BOOKED');
      expect(createdActivity.note).toContain('Appointment booked for New Deal - Website Design');
      expect(createdActivity.data).toHaveProperty('source', 'iClosed via Zapier');
      expect(createdActivity.data).toHaveProperty('deal_name', 'New Deal - Website Design');
    });
  });

  describe('Test Suite 2: "lead_status_changed" Event', () => {
    let existingContact;
    let existingDeal;

    beforeEach(async () => {
      // Clean up specific data before each test
      await prisma.activity.deleteMany();
      await prisma.deal.deleteMany();
      await prisma.contact.deleteMany({
        where: { 
          email: { not: 'new.user@test.com' } // Keep the contact from the first test
        },
      });

      // Create a dummy Contact and an associated Deal in a starting stage (e.g., "Booked Call")
      existingContact = await prisma.contact.create({
        data: {
          firstName: 'Existing',
          lastName: 'User',
          email: 'existing.user@test.com',
          phone: '0987654321',
          userId: testUser.id,
        },
      });

      const bookedCallStage = await prisma.pipelineStage.findFirst({
        where: { name: 'Booked Call' },
      });

      existingDeal = await prisma.deal.create({
        data: {
          title: 'Existing Deal - Mobile App',
          value: 7500,
          stageId: bookedCallStage.id,
          pipelineId: bookedCallStage.pipelineId,
          contactId: existingContact.id,
          userId: testUser.id,
        },
      });
    });

    it('should update an existing deal\'s stage when a "lead_status_changed" event is received', async () => {
      // Arrange: Prepare a JSON payload with the existing contact's email and a new_status of "Proposal Sent"
      const payload = {
        event: 'lead_status_changed',
        contact: {
          email: 'existing.user@test.com',
          name: 'Existing User',
        },
        deal: {
          title: 'Existing Deal - Mobile App',
          value: 7500,
          stageId: null, // Not using stageId in this test, relying on stage name
          new_status: 'Proposal Sent',
        },
      };

      // Act: Send the POST request to the webhook endpoint
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .send(payload);

      // Assert: Check the HTTP response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');

      // Query the database for the Deal we created
      const updatedDeal = await prisma.deal.findUnique({
        where: { id: existingDeal.id },
        include: { stage: true },
      });

      // Confirm its pipeline_stage_id has been updated to the ID corresponding to "Proposal Sent"
      expect(updatedDeal).toBeTruthy();
      expect(updatedDeal.stage.name).toBe('Proposal Sent');
      expect(updatedDeal.value).toBe(7500); // Value should remain unchanged
      expect(updatedDeal.contactId).toBe(existingContact.id); // Contact association should remain unchanged
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed payload gracefully', async () => {
      // Arrange: Prepare a malformed payload
      const payload = {
        invalid: 'payload',
      };

      // Act: Send the POST request to the webhook endpoint
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .send(payload);

      // Assert: Check the HTTP response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');
    });

    it('should handle missing contact data gracefully', async () => {
      // Arrange: Prepare a payload with missing contact data
      const payload = {
        event: 'call_booked',
        deal: {
          title: 'Deal without contact',
          value: 1000,
        },
      };

      // Act: Send the POST request to the webhook endpoint
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .send(payload);

      // Assert: Check the HTTP response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');
    });

    it('should handle missing deal data gracefully', async () => {
      // Arrange: Prepare a payload with missing deal data
      const payload = {
        event: 'call_booked',
        contact: {
          email: 'contact.only@test.com',
          name: 'Contact Only',
        },
      };

      // Act: Send the POST request to the webhook endpoint
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .send(payload);

      // Assert: Check the HTTP response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');

      // Verify that contact was created but no deal was created
      const createdContact = await prisma.contact.findUnique({
        where: { email: 'contact.only@test.com' },
      });
      expect(createdContact).toBeTruthy();

      const deal = await prisma.deal.findFirst({
        where: { title: 'Contact Only' }, // Deal title would be based on contact name if no deal data
      });
      expect(deal).toBeFalsy(); // No deal should be created without deal data
    });
  });
});
