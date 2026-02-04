// backend/tests/unit/repositories/journeyRepository.test.js
const { PrismaClient } = require('@prisma/client');
const journeyRepo = require('../../../src/repositories/journeyRepository');

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    journey: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    }
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

const prisma = new PrismaClient();

describe('JourneyRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all journeys', async () => {
      const mockJourneys = [
        { id: 'j1', name: 'Journey 1', status: 'active' },
        { id: 'j2', name: 'Journey 2', status: 'draft' }
      ];
      prisma.journey.findMany.mockResolvedValue(mockJourneys);

      const result = await journeyRepo.findAll();

      expect(result).toEqual(mockJourneys);
      expect(prisma.journey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { updatedAt: 'desc' }
        })
      );
    });

    it('should filter by userId', async () => {
      const userId = 'user123';
      prisma.journey.findMany.mockResolvedValue([]);

      await journeyRepo.findAll(userId);

      expect(prisma.journey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        })
      );
    });

    it('should filter by status', async () => {
      const filters = { status: 'active' };
      prisma.journey.findMany.mockResolvedValue([]);

      await journeyRepo.findAll(null, filters);

      expect(prisma.journey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'active' },
          orderBy: { updatedAt: 'desc' }
        })
      );
    });
  });

  describe('findById', () => {
    it('should return journey by id', async () => {
      const mockJourney = { id: 'j1', name: 'Journey 1' };
      prisma.journey.findFirst.mockResolvedValue(mockJourney);

      const result = await journeyRepo.findById('j1');

      expect(result).toEqual(mockJourney);
      expect(prisma.journey.findFirst).toHaveBeenCalledWith({
        where: { id: 'j1' }
      });
    });

    it('should filter by userId if provided', async () => {
      prisma.journey.findFirst.mockResolvedValue(null);

      await journeyRepo.findById('j1', 'user123');

      expect(prisma.journey.findFirst).toHaveBeenCalledWith({
        where: { id: 'j1', userId: 'user123' }
      });
    });

    it('should return null if not found', async () => {
      prisma.journey.findFirst.mockResolvedValue(null);

      const result = await journeyRepo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new journey', async () => {
      const journeyData = {
        id: 'j1',
        name: 'New Journey',
        nodes: [],
        edges: []
      };
      const mockCreated = { ...journeyData, status: 'draft' };
      prisma.journey.create.mockResolvedValue(mockCreated);

      const result = await journeyRepo.create(journeyData);

      expect(result).toEqual(mockCreated);
      expect(prisma.journey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: journeyData.id,
          name: journeyData.name,
          status: 'draft'
        })
      });
    });

    it('should associate journey with user', async () => {
      const journeyData = { name: 'Journey', nodes: [], edges: [] };
      prisma.journey.create.mockResolvedValue({});

      await journeyRepo.create(journeyData, 'user123');

      expect(prisma.journey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123'
        })
      });
    });
  });

  describe('update', () => {
    it('should update journey', async () => {
      const updates = { name: 'Updated Name' };
      const mockUpdated = { id: 'j1', name: 'Updated Name' };
      prisma.journey.findFirst.mockResolvedValue({ id: 'j1' });
      prisma.journey.update.mockResolvedValue(mockUpdated);

      const result = await journeyRepo.update('j1', updates);

      expect(result).toEqual(mockUpdated);
      expect(prisma.journey.update).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: expect.objectContaining(updates)
      });
    });

    it('should throw error if journey not found', async () => {
      prisma.journey.findFirst.mockResolvedValue(null);

      await expect(journeyRepo.update('nonexistent', {}))
        .rejects.toThrow('Journey not found');
    });
  });

  describe('delete', () => {
    it('should delete journey', async () => {
      prisma.journey.findFirst.mockResolvedValue({ id: 'j1' });
      prisma.journey.delete.mockResolvedValue({ id: 'j1' });

      await journeyRepo.delete('j1');

      expect(prisma.journey.delete).toHaveBeenCalledWith({
        where: { id: 'j1' }
      });
    });

    it('should throw error if journey not found', async () => {
      prisma.journey.findFirst.mockResolvedValue(null);

      await expect(journeyRepo.delete('nonexistent'))
        .rejects.toThrow('Journey not found');
    });
  });

  describe('duplicate', () => {
    it('should duplicate journey with new id', async () => {
      const original = {
        id: 'j1',
        name: 'Original',
        nodes: [{ id: 'n1' }],
        edges: [{ id: 'e1' }]
      };
      prisma.journey.findFirst.mockResolvedValue(original);
      prisma.journey.create.mockResolvedValue({ ...original, id: 'j2' });

      const result = await journeyRepo.duplicate('j1');

      expect(result.name).toContain('Copy');
      expect(prisma.journey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: expect.stringContaining('Copy'),
          nodes: original.nodes,
          edges: original.edges
        })
      });
    });
  });

  describe('count', () => {
    it('should return journey count', async () => {
      prisma.journey.count.mockResolvedValue(42);

      const result = await journeyRepo.count();

      expect(result).toBe(42);
      expect(prisma.journey.count).toHaveBeenCalled();
    });

    it('should filter count by userId', async () => {
      prisma.journey.count.mockResolvedValue(10);

      await journeyRepo.count('user123');

      expect(prisma.journey.count).toHaveBeenCalledWith({
        where: { userId: 'user123' }
      });
    });
  });
});
