const runRepo = require('../repositories/runRepository');
const journeyRepo = require('../repositories/journeyRepository');
const { flowQueue } = require('../queues/messageQueue');
const logger = require('../utils/logger');

class RunService {
  /**
   * Create and start a run
   * @param {string} flowId - Journey ID
   * @param {string} userId - User ID (optional)
   * @param {Array} audience - Optional audience override
   * @returns {Promise<Object>} Created run
   */
  async createAndStartRun(flowId, userId = null, audience = null) {
    try {
      // Get journey
      const journey = await journeyRepo.findById(flowId, userId);

      if (!journey) {
        throw new Error('Journey not found');
      }

      // Extract audience
      let contacts = audience;

      if (!contacts || contacts.length === 0) {
        // Extract from audience node
        const audNode = journey.nodes.find(n => n.type === 'audience');

        if (!audNode) {
          throw new Error('No audience node found in journey');
        }

        const phoneKey = audNode.data?.phoneKey;
        const rows = audNode.data?.allRows || audNode.data?.rows || [];

        if (!phoneKey || rows.length === 0) {
          throw new Error('Audience node must have phoneKey and rows');
        }

        // Map rows to contacts
        const mapping = audNode.data?.mapping || {};
        contacts = rows.map(row => {
          const vars = {};
          Object.entries(mapping).forEach(([col, variable]) => {
            vars[variable] = row[col];
          });
          return {
            phone: row[phoneKey],
            ...vars
          };
        });
      }

      if (contacts.length === 0) {
        throw new Error('No contacts to process');
      }

      // Create run
      const runId = `run_${Date.now()}${Math.floor(Math.random() * 9999)}`;
      const run = await runRepo.create(
        {
          id: runId,
          flowId: journey.id,
          flowName: journey.name,
          status: 'queued',
          total: contacts.length,
          journeyId: journey.id
        },
        userId
      );

      // Create contacts in database
      const contactsData = contacts.map(contact => ({
        phone: contact.phone,
        vars: contact,
        state: 'active'
      }));

      await runRepo.createContacts(runId, contactsData);

      // Add job to flow queue
      await flowQueue.add(
        'process-run',
        {
          runId,
          journeyId: journey.id
        },
        {
          jobId: runId, // Prevent duplicate jobs
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      logger.info('Run created and queued', {
        runId,
        journeyId: journey.id,
        contacts: contacts.length,
        userId
      });

      return run;
    } catch (error) {
      logger.error('Failed to create and start run', {
        error: error.message,
        flowId,
        userId
      });
      throw error;
    }
  }

  /**
   * Stop a running run
   * @param {string} runId - Run ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Result
   */
  async stopRun(runId, userId = null) {
    try {
      const run = await runRepo.findById(runId, userId);

      if (!run) {
        throw new Error('Run not found');
      }

      if (run.status === 'done' || run.status === 'stopped') {
        logger.warn('Attempt to stop already finished run', { runId, status: run.status });
        return { success: true, message: 'Run already finished' };
      }

      // Update run status
      await runRepo.update(runId, {
        status: 'stopped',
        endedAt: new Date()
      });

      // Try to remove job from queue (if still queued)
      try {
        const job = await flowQueue.getJob(runId);
        if (job) {
          await job.remove();
          logger.info('Removed job from queue', { runId });
        }
      } catch (err) {
        logger.warn('Could not remove job from queue', { runId, error: err.message });
      }

      logger.info('Run stopped', { runId, userId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to stop run', {
        error: error.message,
        runId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get run statistics
   * @param {string} runId - Run ID
   * @returns {Promise<Object>} Statistics
   */
  async getRunStats(runId) {
    try {
      const run = await runRepo.findById(runId, null, true); // Include contacts

      if (!run) {
        throw new Error('Run not found');
      }

      const contacts = run.contacts || [];

      const stats = {
        total: run.total,
        processed: run.processed,
        active: contacts.filter(c => c.state === 'active').length,
        waiting: contacts.filter(c => c.state === 'waiting').length,
        done: contacts.filter(c => c.state === 'done').length,
        failed: contacts.filter(c => c.state === 'failed').length,
        progress: run.total > 0 ? Math.round((run.processed / run.total) * 100) : 0
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get run stats', {
        error: error.message,
        runId
      });
      throw error;
    }
  }
}

module.exports = new RunService();
