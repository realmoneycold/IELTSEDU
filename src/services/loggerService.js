const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const redactFormat = winston.format((info) => {
  const redactList = ['password', 'token', 'authorization', 'cookie', 'client_secret'];
  const redactInPlace = (obj, seen = new WeakSet()) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj instanceof Error) return;
    if (seen.has(obj)) return;
    seen.add(obj);

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        const lowerKey = key.toLowerCase();
        if (typeof val === 'string') {
          if (redactList.some(r => lowerKey.includes(r))) {
            obj[key] = '***REDACTED***';
          } else if (val.startsWith('postgresql://') || val.startsWith('postgres://')) {
            obj[key] = val.replace(/:([^:@/]+)@/, ':********@');
          }
        } else if (val && typeof val === 'object') {
          if (redactList.some(r => lowerKey.includes(r))) {
            obj[key] = '***REDACTED***';
          } else {
            redactInPlace(val, seen);
          }
        }
      }
    }
  };

  if (typeof info.message === 'string') {
    info.message = info.message.replace(/(password|token|authorization|cookie)=([^&\s]+)/gi, '$1=***REDACTED***');
    info.message = info.message.replace(/(postgresql:\/\/|postgres:\/\/)[^:]+:([^@]+)@/gi, '$1postgres:********@');
  }

  redactInPlace(info);
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ieltspractice-api' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
} else {
  // In production also log to console but in JSON format for log aggregators
  logger.add(new winston.transports.Console({
    format: winston.format.json(),
  }));
}

module.exports = logger;
