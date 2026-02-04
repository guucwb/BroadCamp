const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class JourneyRepository {
  /**
   * Find all journeys with optional filters
   * @param {string} userId - User ID (optional)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of journeys
   */
  async findAll(userId = null, filters = {}) {
    try {
      const where = {};
      if (userId) where.userId = userId;
      if (filters.status) where.status = filters.status;

      const journeys = await prisma.journey.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
          createdAt: true,
          userId: true
        },
        orderBy: { updatedAt: 'desc' }
      });

      logger.debug('Journeys fetched', { count: journeys.length, userId });
      return journeys;
    } catch (error) {
      logger.error('JourneyRepository.findAll failed', {
        error: error.message,
        userId,
        filters
      });
      throw error;
    }
  }

  /**
   * Find journey by ID
   * @param {string} id - Journey ID
   * @param {string} userId - User ID (optional, for authorization)
   * @returns {Promise<Object|null>} Journey or null
   */
  async findById(id, userId = null) {
    try {
      const where = { id };
      if (userId) where.userId = userId;

      const journey = await prisma.journey.findFirst({ where });

      if (journey) {
        logger.debug('Journey found', { id, userId });
      } else {
        logger.warn('Journey not found', { id, userId });
      }

      return journey;
    } catch (error) {
      logger.error('JourneyRepository.findById failed', {
        error: error.message,
        id,
        userId
      });
      throw error;
    }
  }

  /**
   * Create a new journey
   * @param {Object} data - Journey data
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Created journey
   */
  async create(data, userId = null) {
    try {
      const journeyData = {
        id: data.id || `flow_${Date.now()}`,
        name: data.name || 'Untitled Flow',
        nodes: data.nodes || [],
        edges: data.edges || [],
        status: data.status || 'draft'
      };

      if (userId) {
        journeyData.userId = userId;
      }

      const journey = await prisma.journey.create({
        data: journeyData
      });

      logger.info('Journey created', {
        id: journey.id,
        name: journey.name,
        userId
      });

      return journey;
    } catch (error) {
      logger.error('JourneyRepository.create failed', {
        error: error.message,
        data: data.name,
        userId
      });
      throw error;
    }
  }

  /**
   * Update journey
   * @param {string} id - Journey ID
   * @param {Object} data - Update data
   * @param {string} userId - User ID (optional, for authorization)
   * @returns {Promise<Object>} Updated journey
   */
  async update(id, data, userId = null) {
    try {
      const where = { id };
      if (userId) where.userId = userId;

      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.nodes !== undefined) updateData.nodes = data.nodes;
      if (data.edges !== undefined) updateData.edges = data.edges;
      if (data.status !== undefined) updateData.status = data.status;

      updateData.updatedAt = new Date();

      const journey = await prisma.journey.update({
        where,
        data: updateData
      });

      logger.info('Journey updated', {
        id,
        userId,
        fields: Object.keys(updateData)
      });

      return journey;
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn('Journey not found for update', { id, userId });
        throw new Error('Journey not found');
      }

      logger.error('JourneyRepository.update failed', {
        error: error.message,
        id,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete journey
   * @param {string} id - Journey ID
   * @param {string} userId - User ID (optional, for authorization)
   * @returns {Promise<Object>} Result
   */
  async delete(id, userId = null) {
    try {
      const where = { id };
      if (userId) where.userId = userId;

      await prisma.journey.delete({ where });

      logger.info('Journey deleted', { id, userId });

      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn('Journey not found for deletion', { id, userId });
        throw new Error('Journey not found');
      }

      logger.error('JourneyRepository.delete failed', {
        error: error.message,
        id,
        userId
      });
      throw error;
    }
  }

  /**
   * Duplicate journey
   * @param {string} id - Journey ID to duplicate
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Duplicated journey
   */
  async duplicate(id, userId = null) {
    try {
      const original = await this.findById(id, userId);

      if (!original) {
        throw new Error('Journey not found');
      }

      const duplicated = await this.create(
        {
          name: `${original.name} (copy)`,
          nodes: original.nodes,
          edges: original.edges,
          status: 'draft'
        },
        userId
      );

      logger.info('Journey duplicated', {
        originalId: id,
        newId: duplicated.id,
        userId
      });

      return duplicated;
    } catch (error) {
      logger.error('JourneyRepository.duplicate failed', {
        error: error.message,
        id,
        userId
      });
      throw error;
    }
  }

  /**
   * Count journeys
   * @param {string} userId - User ID (optional)
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Count
   */
  async count(userId = null, filters = {}) {
    try {
      const where = {};
      if (userId) where.userId = userId;
      if (filters.status) where.status = filters.status;

      return await prisma.journey.count({ where });
    } catch (error) {
      logger.error('JourneyRepository.count failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

module.exports = new JourneyRepository();
