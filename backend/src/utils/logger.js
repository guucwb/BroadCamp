const winston = require('winston');
const path = require('path');

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'whatsapp-campaign-api' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(__dirname, '..', '..', 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(__dirname, '..', '..', 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If not in production, also log to console with prettier format
if (nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      ),
    })
  );
}

module.exports = logger;
