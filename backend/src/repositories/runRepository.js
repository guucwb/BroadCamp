const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class RunRepository {
  /**
   * Find all runs with optional filters
   * @param {string} userId - User ID (optional)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of runs
   */
  async findAll(userId = null, filters = {}) {
    try {
      const where = {};
      if (userId) where.userId = userId;
      if (filters.status) where.status = filters.status;
      if (filters.journeyId) where.journeyId = filters.journeyId;

      const runs = await prisma.run.findMany({
        where,
        include: {
          journey: {
            select: { id: true, name: true }
          },
          _count: {
            select: { contacts: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      logger.debug('Runs fetched', { count: runs.length, userId, filters });
      return runs;
    } catch (error) {
      logger.error('RunRepository.findAll failed', {
        error: error.message,
        userId,
        filters
      });
      throw error;
    }
  }

  /**
   * Find run by ID
   * @param {string} id - Run ID
   * @param {string} userId - User ID (optional)
   * @param {boolean} includeContacts - Include contacts in result
   * @returns {Promise<Object|null>} Run or null
   */
  async findById(id, userId = null, includeContacts = false) {
    try {
      const where = { id };
      if (userId) where.userId = userId;

      const run = await prisma.run.findFirst({
        where,
        include: {
          ...(includeContacts && { contacts: true }),
          journey: {
            select: { id: true, name: true, nodes: true, edges: true }
          }
        }
      });

      if (run) {
        logger.debug('Run found', { id, userId, contactsIncluded: includeContacts });
      } else {
        logger.warn('Run not found', { id, userId });
      }

      return run;
    } catch (error) {
      logger.error('RunRepository.findById failed', {
        error: error.message,
        id,
        userId
      });
      throw error;
    }
  }

  /**
   * Create a new run
   * @param {Object} data - Run data
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Created run
   */
  async create(data, userId = null) {
    try {
      const runData = {
        id: data.id || `run_${Date.now()}${Math.floor(Math.random() * 9999)}`,
        flowId: data.flowId,
        flowName: data.flowName || 'Unnamed Flow',
        status: data.status || 'queued',
        processed: data.processed || 0,
        total: data.total || 0
      };

      if (userId) runData.userId = userId;
      if (data.journeyId) runData.journeyId = data.journeyId;
      if (data.startedAt) runData.startedAt = new Date(data.startedAt);
      if (data.error) runData.error = data.error;

      const run = await prisma.run.create({
        data: runData
      });

      logger.info('Run created', {
        id: run.id,
        flowId: run.flowId,
        total: run.total,
        userId
      });

      return run;
    } catch (error) {
      logger.error('RunRepository.create failed', {
        error: error.message,
        flowId: data.flowId,
        userId
      });
      throw error;
    }
  }

  /**
   * Update run
   * @param {string} id - Run ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated run
   */
  async update(id, data) {
    try {
      const updateData = { ...data, updatedAt: new Date() };

      const run = await prisma.run.update({
        where: { id },
        data: updateData
      });

      logger.info('Run updated', {
        id,
        fields: Object.keys(data),
        status: run.status
      });

      return run;
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn('Run not found for update', { id });
        throw new Error('Run not found');
      }

      logger.error('RunRepository.update failed', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Delete run
   * @param {string} id - Run ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Result
   */
  async delete(id, userId = null) {
    try {
      const where = { id };
      if (userId) where.userId = userId;

      await prisma.run.delete({ where });

      logger.info('Run deleted', { id, userId });

      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn('Run not found for deletion', { id, userId });
        throw new Error('Run not found');
      }

      logger.error('RunRepository.delete failed', {
        error: error.message,
        id,
        userId
      });
      throw error;
    }
  }

  /**
   * Create contacts for a run
   * @param {string} runId - Run ID
   * @param {Array} contactsData - Array of contact data
   * @returns {Promise<Array>} Created contacts
   */
  async createContacts(runId, contactsData) {
    try {
      const contacts = await prisma.$transaction(
        contactsData.map(contact =>
          prisma.contact.create({
            data: {
              runId,
              phone: contact.phone,
              vars: contact.vars || {},
              cursor: contact.cursor || null,
              state: contact.state || 'active',
              history: contact.history || []
            }
          })
        )
      );

      logger.info('Contacts created', {
        runId,
        count: contacts.length
      });

      return contacts;
    } catch (error) {
      logger.error('RunRepository.createContacts failed', {
        error: error.message,
        runId,
        count: contactsData.length
      });
      throw error;
    }
  }

  /**
   * Update multiple contacts
   * @param {string} runId - Run ID
   * @param {Array} contactsData - Array of contact updates
   * @returns {Promise<Array>} Updated contacts
   */
  async updateContacts(runId, contactsData) {
    try {
      const results = await prisma.$transaction(
        contactsData.map(contact =>
          prisma.contact.upsert({
            where: { id: contact.id || 'new' },
            update: {
              cursor: contact.cursor,
              state: contact.state,
              history: contact.history,
              lastInbound: contact.lastInbound,
              wait: contact.wait,
              updatedAt: new Date()
            },
            create: {
              runId,
              phone: contact.phone,
              vars: contact.vars || {},
              cursor: contact.cursor,
              state: contact.state || 'active',
              history: contact.history || []
            }
          })
        )
      );

      logger.debug('Contacts updated', {
        runId,
        count: results.length
      });

      return results;
    } catch (error) {
      logger.error('RunRepository.updateContacts failed', {
        error: error.message,
        runId,
        count: contactsData.length
      });
      throw error;
    }
  }

  /**
   * Update single contact
   * @param {string} contactId - Contact ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, data) {
    try {
      const contact = await prisma.contact.update({
        where: { id: contactId },
        data: { ...data, updatedAt: new Date() }
      });

      logger.debug('Contact updated', {
        contactId,
        state: contact.state
      });

      return contact;
    } catch (error) {
      logger.error('RunRepository.updateContact failed', {
        error: error.message,
        contactId
      });
      throw error;
    }
  }

  /**
   * Find contacts by state
   * @param {string} runId - Run ID
   * @param {string} state - Contact state
   * @returns {Promise<Array>} Contacts
   */
  async findContactsByState(runId, state) {
    try {
      const contacts = await prisma.contact.findMany({
        where: { runId, state }
      });

      logger.debug('Contacts found by state', {
        runId,
        state,
        count: contacts.length
      });

      return contacts;
    } catch (error) {
      logger.error('RunRepository.findContactsByState failed', {
        error: error.message,
        runId,
        state
      });
      throw error;
    }
  }

  /**
   * Find contact by phone in a run
   * @param {string} runId - Run ID
   * @param {string} phone - Phone number
   * @returns {Promise<Object|null>} Contact or null
   */
  async findContactByPhone(runId, phone) {
    try {
      const contact = await prisma.contact.findFirst({
        where: { runId, phone }
      });

      return contact;
    } catch (error) {
      logger.error('RunRepository.findContactByPhone failed', {
        error: error.message,
        runId,
        phone
      });
      throw error;
    }
  }

  /**
   * Count runs
   * @param {string} userId - User ID (optional)
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Count
   */
  async count(userId = null, filters = {}) {
    try {
      const where = {};
      if (userId) where.userId = userId;
      if (filters.status) where.status = filters.status;

      return await prisma.run.count({ where });
    } catch (error) {
      logger.error('RunRepository.count failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

module.exports = new RunRepository();
