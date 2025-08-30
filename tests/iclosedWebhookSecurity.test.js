const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/services/db');

describe('iClosed Webhook Security Tests', () => {
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
    await prisma.webhookLog.deleteMany();

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
      { name: 'New', order: 1, pipelineId: pipeline.id },
      { name: 'Qualified', order: 2, pipelineId: pipeline.id },
      { name: 'Proposal', order: 3, pipelineId: pipeline.id },
      { name: 'Negotiation', order: 4, pipelineId: pipeline.id },
      { name: 'Closed Won', order: 5, pipelineId: pipeline.id },
      { name: 'Closed Lost', order: 6, pipelineId: pipeline.id },
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
    await prisma.webhookLog.deleteMany();
    await prisma.$disconnect();
  });

  describe('Security Tests', () => {
    it('should reject requests without the X-Webhook-Secret header', async () => {
      // Arrange: Prepare a valid payload
      const payload = {
        event: 'appointment_booked',
        event_id: 'test-event-123',
        contact: {
          email: 'test@example.com',
          name: 'Test User',
        },
        deal: {
          title: 'Test Deal',
          value: 1000,
        },
      };

      // Act: Send request without secret header
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .send(payload);

      // Assert: Check the HTTP response
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('message', 'Unauthorized: Invalid or missing secret token');
    });

    it('should reject requests with an incorrect X-Webhook-Secret header', async () => {
      // Arrange: Prepare a valid payload
      const payload = {
        event: 'appointment_booked',
        event_id: 'test-event-123',
        contact: {
          email: 'test@example.com',
          name: 'Test User',
        },
        deal: {
          title: 'Test Deal',
          value: 1000,
        },
      };

      // Act: Send request with incorrect secret
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', 'wrong-secret')
        .send(payload);

      // Assert: Check the HTTP response
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('message', 'Unauthorized: Invalid or missing secret token');
    });

    it('should accept requests with the correct X-Webhook-Secret header', async () => {
      // Arrange: Prepare a valid payload
      const payload = {
        event: 'appointment_booked',
        event_id: 'test-event-123',
        contact: {
          email: 'test@example.com',
          name: 'Test User',
        },
        deal: {
          title: 'Test Deal',
          value: 1000,
        },
      };

      // Act: Send request with correct secret (using environment variable)
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', process.env.ICLOSED_SECRET || 'test-secret')
        .send(payload);

      // Assert: Check the HTTP response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');
    });
  });

  describe('Idempotency Tests', () => {
    it('should process duplicate events with the same event_id only once', async () => {
      // Arrange: Prepare a payload with event_id
      const payload = {
        event: 'appointment_booked',
        event_id: 'duplicate-event-123',
        contact: {
          email: 'duplicate@example.com',
          name: 'Duplicate User',
        },
        deal: {
          title: 'Duplicate Deal',
          value: 2000,
        },
      };

      // Act: Send the same request twice
      const res1 = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', process.env.ICLOSED_SECRET || 'test-secret')
        .send(payload);

      const res2 = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', process.env.ICLOSED_SECRET || 'test-secret')
        .send(payload);

      // Assert: Check both responses
      expect(res1.statusCode).toEqual(200);
      expect(res1.body).toHaveProperty('status', 'success');
      expect(res1.body).toHaveProperty('message', 'Webhook processed successfully');

      expect(res2.statusCode).toEqual(200);
      expect(res2.body).toHaveProperty('status', 'success');
      expect(res2.body).toHaveProperty('message', 'Duplicate event - already processed');

      // Verify only one contact was created
      const contacts = await prisma.contact.findMany({
        where: { email: 'duplicate@example.com' }
      });
      expect(contacts.length).toBe(1);

      // Verify only one deal was created
      const deals = await prisma.deal.findMany({
        where: { title: 'Duplicate Deal' }
      });
      expect(deals.length).toBe(1);

      // Verify only one webhook log was created for the event
      const webhookLogs = await prisma.webhookLog.findMany({
        where: { eventId: 'duplicate-event-123' }
      });
      expect(webhookLogs.length).toBe(1);
    });

    it('should process events without event_id normally', async () => {
      // Arrange: Prepare a payload without event_id
      const payload = {
        event: 'appointment_booked',
        contact: {
          email: 'no-event-id@example.com',
          name: 'No Event ID User',
        },
        deal: {
          title: 'No Event ID Deal',
          value: 3000,
        },
      };

      // Act: Send the request
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', process.env.ICLOSED_SECRET || 'test-secret')
        .send(payload);

      // Assert: Check the response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');

      // Verify contact was created
      const contact = await prisma.contact.findUnique({
        where: { email: 'no-event-id@example.com' }
      });
      expect(contact).toBeTruthy();

      // Verify deal was created
      const deal = await prisma.deal.findFirst({
        where: { title: 'No Event ID Deal' }
      });
      expect(deal).toBeTruthy();
    });
  });

  describe('Event Handler Tests', () => {
    it('should handle appointment_booked event correctly', async () => {
      // Arrange: Prepare an appointment_booked payload
      const payload = {
        event: 'appointment_booked',
        event_id: 'appointment-event-123',
        contact: {
          email: 'appointment@example.com',
          name: 'Appointment User',
          phone: '1234567890',
        },
        deal: {
          title: 'Appointment Deal',
          value: 4000,
        },
        appointment_time: '2023-12-20T14:00:00Z',
        booking_details: {
          duration: 60,
          notes: 'Initial consultation'
        }
      };

      // Act: Send the request
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', process.env.ICLOSED_SECRET || 'test-secret')
        .send(payload);

      // Assert: Check the response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');

      // Verify contact was created
      const contact = await prisma.contact.findUnique({
        where: { email: 'appointment@example.com' }
      });
      expect(contact).toBeTruthy();
      expect(contact.firstName).toBe('Appointment');
      expect(contact.lastName).toBe('User');

      // Verify deal was created with "New" stage and "iClosed" source
      const deal = await prisma.deal.findFirst({
        where: { title: 'Appointment Deal' },
        include: { stage: true }
      });
      expect(deal).toBeTruthy();
      expect(deal.stage.name).toBe('New');
      expect(deal.data).toHaveProperty('source', 'iClosed');

      // Verify activity was logged
      const activity = await prisma.activity.findFirst({
        where: { 
          type: 'APPOINTMENT_BOOKED',
          contactId: contact.id
        }
      });
      expect(activity).toBeTruthy();
      expect(activity.note).toContain('Appointment booked for');
      expect(activity.data).toHaveProperty('source', 'iClosed');
    });

    it('should handle status_changed event correctly', async () => {
      // First, create a deal to update
      const contact = await prisma.contact.create({
        data: {
          firstName: 'Status',
          lastName: 'User',
          email: 'status@example.com',
          userId: testUser.id,
        },
      });

      const newStage = await prisma.pipelineStage.findFirst({
        where: { name: 'Qualified' }
      });

      const deal = await prisma.deal.create({
        data: {
          title: 'Status Deal',
          value: 5000,
          stageId: newStage.id,
          pipelineId: newStage.pipelineId,
          contactId: contact.id,
          userId: testUser.id,
        },
      });

      // Arrange: Prepare a status_changed payload
      const payload = {
        event: 'status_changed',
        event_id: 'status-event-123',
        deal: {
          id: deal.id,
          new_status: 'Negotiation',
        },
      };

      // Act: Send the request
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', process.env.ICLOSED_SECRET || 'test-secret')
        .send(payload);

      // Assert: Check the response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');

      // Verify deal stage was updated
      const updatedDeal = await prisma.deal.findUnique({
        where: { id: deal.id },
        include: { stage: true }
      });
      expect(updatedDeal.stage.name).toBe('Negotiation');

      // Verify activity was logged
      const activity = await prisma.activity.findFirst({
        where: { 
          type: 'DEAL_STATUS_CHANGED',
          dealId: deal.id
        }
      });
      expect(activity).toBeTruthy();
      expect(activity.note).toContain('Deal status changed to: Negotiation');
      expect(activity.data).toHaveProperty('newStatus', 'Negotiation');
    });

    it('should handle unknown event types gracefully', async () => {
      // Arrange: Prepare a payload with unknown event type
      const payload = {
        event: 'unknown_event',
        event_id: 'unknown-event-123',
        contact: {
          email: 'unknown@example.com',
          name: 'Unknown User',
        },
      };

      // Act: Send the request
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', process.env.ICLOSED_SECRET || 'test-secret')
        .send(payload);

      // Assert: Check the response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('message', 'Event type unknown_event received but not processed');

      // Verify no contact was created
      const contact = await prisma.contact.findUnique({
        where: { email: 'unknown@example.com' }
      });
      expect(contact).toBeFalsy();
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle malformed payload gracefully', async () => {
      // Arrange: Prepare a malformed payload
      const payload = {
        invalid: 'payload',
      };

      // Act: Send the request with correct secret
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', process.env.ICLOSED_SECRET || 'test-secret')
        .send(payload);

      // Assert: Check the response
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('message', 'Bad Request: Missing event in payload');
    });

    it('should handle database errors gracefully', async () => {
      // Mock the prisma client to simulate a database error
      jest.spyOn(prisma.user, 'findFirst').mockRejectedValueOnce(new Error('Database connection failed'));

      // Arrange: Prepare a valid payload
      const payload = {
        event: 'appointment_booked',
        event_id: 'db-error-event-123',
        contact: {
          email: 'db-error@example.com',
          name: 'DB Error User',
        },
      };

      // Act: Send the request
      const res = await request(app)
        .post('/api/v1/webhooks/iclosed')
        .set('X-Webhook-Secret', process.env.ICLOSED_SECRET || 'test-secret')
        .send(payload);

      // Assert: Check the response
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('message', 'Internal Server Error: Failed to find user');

      // Restore the original method
      jest.restoreAllMocks();
    });
  });
});
