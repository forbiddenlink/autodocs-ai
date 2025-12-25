import winston from 'winston';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(logColors);

// Structured JSON format for production, human-readable for development
const isProduction = process.env.NODE_ENV === 'production';

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...meta } = info;
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} ${level}: ${message} ${metaStr}`;
    }
  )
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const format = isProduction ? jsonFormat : consoleFormat;

// Console uses appropriate format based on environment
const consoleTransport = new winston.transports.Console({
  format: isProduction
    ? jsonFormat
    : consoleFormat
});

// File transports always use JSON format for parsing/searching
const transports = [
  consoleTransport,
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: jsonFormat
  }),
  new winston.transports.File({
    filename: 'logs/all.log',
    format: jsonFormat
  }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format,
  transports,
});
