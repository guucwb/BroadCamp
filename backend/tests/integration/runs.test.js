// backend/tests/integration/runs.test.js
const request = require('supertest');

// Mock repositories
jest.mock('../../src/repositories/runRepository');
jest.mock('../../src/queues/messageQueue', () => ({
  messageQueue: { add: jest.fn() },
  flowQueue: { add: jest.fn(), removeJob: jest.fn() },
  connection: {}
}));

const runRepo = require('../../src/repositories/runRepository');
const app = require('../../src/index');

describe('Run Routes - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/runs', () => {
    it('should return all runs', async () => {
      const mockRuns = [
        { id: 'r1', status: 'running', total: 10, processed: 5 },
        { id: 'r2', status: 'done', total: 20, processed: 20 }
      ];
      runRepo.findAll.mockResolvedValue(mockRuns);

      const res = await request(app)
        .get('/api/runs')
        .expect(200);

      expect(res.body).toEqual(mockRuns);
    });

    it('should filter by status', async () => {
      runRepo.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/runs?status=running')
        .expect(200);

      expect(runRepo.findAll).toHaveBeenCalledWith(
        undefined,
        { status: 'running' }
      );
    });
  });

  describe('GET /api/runs/:id', () => {
    it('should return run by id', async () => {
      const mockRun = { id: 'r1', status: 'running' };
      runRepo.findById.mockResolvedValue(mockRun);

      const res = await request(app)
        .get('/api/runs/r1')
        .expect(200);

      expect(res.body).toEqual(mockRun);
    });

    it('should return 404 if run not found', async () => {
      runRepo.findById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/runs/nonexistent')
        .expect(404);

      expect(res.body.error).toBe('Run not found');
    });

    it('should include contacts when requested', async () => {
      const mockRun = {
        id: 'r1',
        contacts: [{ id: 'c1', phone: '+123' }]
      };
      runRepo.findById.mockResolvedValue(mockRun);

      const res = await request(app)
        .get('/api/runs/r1?includeContacts=true')
        .expect(200);

      expect(res.body.contacts).toBeDefined();
    });
  });

  describe('DELETE /api/runs/:id', () => {
    it('should delete run', async () => {
      runRepo.delete.mockResolvedValue();

      const res = await request(app)
        .delete('/api/runs/r1')
        .expect(200);

      expect(res.body.ok).toBe(true);
    });
  });

  describe('POST /api/runs/:id/stop', () => {
    it('should stop running run', async () => {
      const mockRun = { id: 'r1', status: 'running' };
      runRepo.findById.mockResolvedValue(mockRun);
      runRepo.update.mockResolvedValue({ ...mockRun, status: 'stopped' });

      const res = await request(app)
        .post('/api/runs/r1/stop')
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(runRepo.update).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ status: 'stopped' })
      );
    });

    it('should return 404 if run not found', async () => {
      runRepo.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/runs/nonexistent/stop')
        .expect(404);

      expect(res.body.error).toBe('Run not found');
    });

    it('should return 400 if run already stopped', async () => {
      runRepo.findById.mockResolvedValue({ id: 'r1', status: 'done' });

      const res = await request(app)
        .post('/api/runs/r1/stop')
        .expect(400);

      expect(res.body.error).toContain('Cannot stop');
    });
  });

  describe('GET /api/runs/:id/export', () => {
    it('should export run contacts as CSV', async () => {
      const mockRun = {
        id: 'r1',
        contacts: [
          { phone: '+123', vars: { name: 'User 1' }, state: 'done' },
          { phone: '+456', vars: { name: 'User 2' }, state: 'done' }
        ]
      };
      runRepo.findById.mockResolvedValue(mockRun);

      const res = await request(app)
        .get('/api/runs/r1/export')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('phone');
      expect(res.text).toContain('+123');
      expect(res.text).toContain('+456');
    });

    it('should return 404 if run not found', async () => {
      runRepo.findById.mockResolvedValue(null);

      await request(app)
        .get('/api/runs/nonexistent/export')
        .expect(404);
    });
  });

  describe('GET /api/runs/:id/stats', () => {
    it('should return run statistics', async () => {
      const mockRun = {
        id: 'r1',
        total: 100,
        processed: 75,
        status: 'running',
        contacts: [
          { state: 'done' },
          { state: 'done' },
          { state: 'waiting' },
          { state: 'active' }
        ]
      };
      runRepo.findById.mockResolvedValue(mockRun);

      const res = await request(app)
        .get('/api/runs/r1/stats')
        .expect(200);

      expect(res.body.total).toBe(100);
      expect(res.body.processed).toBe(75);
      expect(res.body.percentage).toBeDefined();
      expect(res.body.byState).toBeDefined();
    });
  });
});
