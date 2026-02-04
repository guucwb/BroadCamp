// backend/tests/unit/repositories/runRepository.test.js
const { PrismaClient } = require('@prisma/client');
const runRepo = require('../../../src/repositories/runRepository');

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    run: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    contact: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn(callback => {
      if (Array.isArray(callback)) {
        return Promise.all(callback);
      }
      return callback(mockPrisma);
    })
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

const prisma = new PrismaClient();

describe('RunRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all runs', async () => {
      const mockRuns = [
        { id: 'r1', status: 'running' },
        { id: 'r2', status: 'done' }
      ];
      prisma.run.findMany.mockResolvedValue(mockRuns);

      const result = await runRepo.findAll();

      expect(result).toEqual(mockRuns);
      expect(prisma.run.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should filter by status', async () => {
      prisma.run.findMany.mockResolvedValue([]);

      await runRepo.findAll(null, { status: 'running' });

      expect(prisma.run.findMany).toHaveBeenCalledWith({
        where: { status: 'running' },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findById', () => {
    it('should return run without contacts by default', async () => {
      const mockRun = { id: 'r1', status: 'running' };
      prisma.run.findFirst.mockResolvedValue(mockRun);

      const result = await runRepo.findById('r1');

      expect(result).toEqual(mockRun);
      expect(prisma.run.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1' }
      });
    });

    it('should include contacts when requested', async () => {
      const mockRun = {
        id: 'r1',
        contacts: [{ id: 'c1', phone: '+123' }]
      };
      prisma.run.findFirst.mockResolvedValue(mockRun);

      const result = await runRepo.findById('r1', null, true);

      expect(result.contacts).toBeDefined();
      expect(prisma.run.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1' },
        include: { contacts: true }
      });
    });
  });

  describe('create', () => {
    it('should create new run', async () => {
      const runData = {
        id: 'r1',
        flowId: 'f1',
        flowName: 'Flow 1',
        status: 'queued',
        total: 10
      };
      prisma.run.create.mockResolvedValue(runData);

      const result = await runRepo.create(runData);

      expect(result).toEqual(runData);
      expect(prisma.run.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: runData.id,
          flowId: runData.flowId,
          status: 'queued'
        })
      });
    });
  });

  describe('update', () => {
    it('should update run', async () => {
      const updates = { status: 'done', processed: 10 };
      prisma.run.update.mockResolvedValue({ id: 'r1', ...updates });

      const result = await runRepo.update('r1', updates);

      expect(result).toMatchObject(updates);
      expect(prisma.run.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: expect.objectContaining(updates)
      });
    });
  });

  describe('createContacts', () => {
    it('should create multiple contacts in transaction', async () => {
      const contactsData = [
        { phone: '+123', vars: {}, state: 'active' },
        { phone: '+456', vars: {}, state: 'active' }
      ];
      const mockContacts = contactsData.map((c, i) => ({ id: `c${i}`, ...c }));

      prisma.$transaction.mockImplementation(operations => {
        return Promise.resolve(operations.map((_, i) => mockContacts[i]));
      });

      const result = await runRepo.createContacts('r1', contactsData);

      expect(result).toHaveLength(2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('updateContact', () => {
    it('should update single contact', async () => {
      const updates = { state: 'done', cursor: 'node2' };
      prisma.contact.update.mockResolvedValue({ id: 'c1', ...updates });

      const result = await runRepo.updateContact('c1', updates);

      expect(result).toMatchObject(updates);
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: expect.objectContaining(updates)
      });
    });
  });

  describe('findContactsByState', () => {
    it('should find contacts by state', async () => {
      const mockContacts = [
        { id: 'c1', state: 'waiting' },
        { id: 'c2', state: 'waiting' }
      ];
      prisma.contact.findMany.mockResolvedValue(mockContacts);

      const result = await runRepo.findContactsByState('r1', 'waiting');

      expect(result).toEqual(mockContacts);
      expect(prisma.contact.findMany).toHaveBeenCalledWith({
        where: { runId: 'r1', state: 'waiting' }
      });
    });
  });

  describe('findContactByPhone', () => {
    it('should find contact by phone', async () => {
      const mockContact = { id: 'c1', phone: '+123' };
      prisma.contact.findFirst.mockResolvedValue(mockContact);

      const result = await runRepo.findContactByPhone('r1', '+123');

      expect(result).toEqual(mockContact);
      expect(prisma.contact.findFirst).toHaveBeenCalledWith({
        where: { runId: 'r1', phone: '+123' }
      });
    });

    it('should return null if not found', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);

      const result = await runRepo.findContactByPhone('r1', '+999');

      expect(result).toBeNull();
    });
  });
});
