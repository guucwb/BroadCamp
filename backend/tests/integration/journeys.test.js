// backend/tests/integration/journeys.test.js
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

// Mock repositories to avoid database calls
jest.mock('../../src/repositories/journeyRepository');
jest.mock('../../src/repositories/runRepository');
jest.mock('../../src/queues/messageQueue', () => ({
  messageQueue: { add: jest.fn(), addBulk: jest.fn() },
  flowQueue: { add: jest.fn() },
  connection: {}
}));

const journeyRepo = require('../../src/repositories/journeyRepository');
const runRepo = require('../../src/repositories/runRepository');
const { flowQueue } = require('../../src/queues/messageQueue');
const app = require('../../src/index');

describe('Journey Routes - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/journeys', () => {
    it('should return all journeys', async () => {
      const mockJourneys = [
        { id: 'j1', name: 'Journey 1', status: 'active' },
        { id: 'j2', name: 'Journey 2', status: 'draft' }
      ];
      journeyRepo.findAll.mockResolvedValue(mockJourneys);

      const res = await request(app)
        .get('/api/journeys')
        .expect(200);

      expect(res.body).toEqual(mockJourneys);
      expect(journeyRepo.findAll).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      journeyRepo.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/journeys?status=active')
        .expect(200);

      expect(journeyRepo.findAll).toHaveBeenCalledWith(
        undefined,
        { status: 'active' }
      );
    });
  });

  describe('GET /api/journeys/:id', () => {
    it('should return journey by id', async () => {
      const mockJourney = { id: 'j1', name: 'Journey 1' };
      journeyRepo.findById.mockResolvedValue(mockJourney);

      const res = await request(app)
        .get('/api/journeys/j1')
        .expect(200);

      expect(res.body).toEqual(mockJourney);
    });

    it('should return 404 if journey not found', async () => {
      journeyRepo.findById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/journeys/nonexistent')
        .expect(404);

      expect(res.body.error).toBe('Journey not found');
    });
  });

  describe('POST /api/journeys', () => {
    it('should create new journey', async () => {
      const journeyData = {
        id: 'j1',
        name: 'New Journey',
        nodes: [],
        edges: []
      };
      journeyRepo.create.mockResolvedValue(journeyData);

      const res = await request(app)
        .post('/api/journeys')
        .send(journeyData)
        .expect(200);

      expect(res.body).toEqual(journeyData);
      expect(journeyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining(journeyData),
        undefined
      );
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/journeys')
        .send({ name: '' }) // Missing required fields
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /api/journeys/:id', () => {
    it('should update journey', async () => {
      const updates = { name: 'Updated Name' };
      journeyRepo.update.mockResolvedValue({ id: 'j1', ...updates });

      const res = await request(app)
        .put('/api/journeys/j1')
        .send(updates)
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/journeys/:id', () => {
    it('should delete journey', async () => {
      journeyRepo.delete.mockResolvedValue();

      const res = await request(app)
        .delete('/api/journeys/j1')
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(journeyRepo.delete).toHaveBeenCalledWith('j1', undefined);
    });
  });

  describe('POST /api/journeys/:id/duplicate', () => {
    it('should duplicate journey', async () => {
      const duplicated = {
        id: 'j2',
        name: 'Journey 1 (Copy)',
        nodes: [],
        edges: []
      };
      journeyRepo.duplicate.mockResolvedValue(duplicated);

      const res = await request(app)
        .post('/api/journeys/j1/duplicate')
        .expect(200);

      expect(res.body.name).toContain('Copy');
    });
  });

  describe('POST /api/journeys/:id/launch', () => {
    it('should launch journey with audience', async () => {
      const journey = {
        id: 'j1',
        name: 'Journey 1',
        nodes: [{ id: 'n1', type: 'audience' }],
        edges: []
      };
      const audience = [
        { phone: '+123', name: 'User 1' },
        { phone: '+456', name: 'User 2' }
      ];

      journeyRepo.findById.mockResolvedValue(journey);
      runRepo.create.mockResolvedValue({ id: 'r1', status: 'queued' });
      runRepo.createContacts.mockResolvedValue([]);
      flowQueue.add.mockResolvedValue({ id: 'job1' });

      const res = await request(app)
        .post('/api/journeys/j1/launch')
        .send({ audience })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.runId).toBeDefined();
      expect(flowQueue.add).toHaveBeenCalled();
    });

    it('should return 404 if journey not found', async () => {
      journeyRepo.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/journeys/nonexistent/launch')
        .send({ audience: [] })
        .expect(404);

      expect(res.body.error).toBe('Journey not found');
    });

    it('should return 400 if no audience provided', async () => {
      const journey = {
        id: 'j1',
        nodes: [{ id: 'n1', type: 'message' }]
      };
      journeyRepo.findById.mockResolvedValue(journey);

      const res = await request(app)
        .post('/api/journeys/j1/launch')
        .send({})
        .expect(400);

      expect(res.body.error).toContain('audience');
    });
  });
});
