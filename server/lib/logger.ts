import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Simple JSON log structure
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
