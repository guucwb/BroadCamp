const Joi = require('joi');
const logger = require('../utils/logger');

// Validation schemas for different routes
const schemas = {
  createJourney: Joi.object({
    id: Joi.string().optional(),
    name: Joi.string().min(1).max(200).required(),
    nodes: Joi.array().items(Joi.object()).required(),
    edges: Joi.array().items(Joi.object()).required()
  }),

  updateJourney: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    nodes: Joi.array().items(Joi.object()).optional(),
    edges: Joi.array().items(Joi.object()).optional(),
    status: Joi.string().valid('draft', 'active', 'archived').optional()
  }),

  createRun: Joi.object({
    flowId: Joi.string().required(),
    audience: Joi.array().items(Joi.object()).optional()
  }),

  sendMessage: Joi.object({
    to: Joi.string().pattern(/^\+?\d{10,15}$/).required().messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g., +5541991234567)'
    }),
    body: Joi.string().max(1600).optional(),
    contentSid: Joi.string().pattern(/^CT[a-z0-9]{32}$/).optional(),
    variables: Joi.object().optional(),
    channel: Joi.string().valid('whatsapp', 'sms').default('whatsapp'),
    from: Joi.string().optional()
  }).xor('body', 'contentSid').messages({
    'object.xor': 'Provide either body (text) OR contentSid (template), not both'
  }),

  sendCampaign: Joi.object({
    messages: Joi.array().items(Joi.object({
      to: Joi.string().pattern(/^\+?\d{10,15}$/).required(),
      body: Joi.string().max(1600).optional(),
      contentSid: Joi.string().pattern(/^CT[a-z0-9]{32}$/).optional(),
      variables: Joi.object().optional(),
      channel: Joi.string().valid('whatsapp', 'sms').default('whatsapp')
    })).min(1).required().messages({
      'array.min': 'At least one message is required'
    })
  }),

  inboundWebhook: Joi.object({
    From: Joi.string().required(),
    Body: Joi.string().allow('').optional(),
    ButtonPayload: Joi.string().optional(),
    ButtonText: Joi.string().optional(),
    MessageSid: Joi.string().optional(),
    AccountSid: Joi.string().optional()
  }).unknown(true), // Allow other Twilio fields

  validateTemplate: Joi.object({
    category: Joi.string().valid('MARKETING', 'UTILITY', 'AUTH').required(),
    language: Joi.string().default('pt_BR'),
    body: Joi.string().required(),
    audience: Joi.string().optional(),
    tone: Joi.string().optional(),
    offerType: Joi.string().optional(),
    triggers: Joi.string().optional()
  })
};

/**
 * Validation middleware factory
 * @param {string} schemaName - Name of the schema to use
 * @returns {Function} Express middleware
 */
function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      logger.error(`Validation schema '${schemaName}' not found`);
      return res.status(500).json({ error: 'Internal validation error' });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, "'") // Make messages prettier
      }));

      logger.warn('Validation failed', {
        schema: schemaName,
        errors,
        ip: req.ip,
        path: req.path
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace req.body with validated and sanitized value
    req.validatedBody = value;
    req.body = value;

    logger.debug('Validation passed', { schema: schemaName });
    next();
  };
}

/**
 * Validate query parameters
 * @param {Object} schema - Joi schema object
 * @returns {Function} Express middleware
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, "'")
      }));

      logger.warn('Query validation failed', { errors, ip: req.ip });
      return res.status(400).json({ error: 'Invalid query parameters', details: errors });
    }

    req.query = value;
    next();
  };
}

/**
 * Validate route parameters
 * @param {Object} schema - Joi schema object
 * @returns {Function} Express middleware
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, "'")
      }));

      logger.warn('Params validation failed', { errors, ip: req.ip });
      return res.status(400).json({ error: 'Invalid parameters', details: errors });
    }

    req.params = value;
    next();
  };
}

module.exports = {
  validate,
  validateQuery,
  validateParams,
  schemas
};
