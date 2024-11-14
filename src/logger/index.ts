import winston from 'winston';

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      // meta[Symbol.for('splat')] contains the metadata if present
      let metaString = '';

      const splatMeta = meta[Symbol.for('splat')] as any[] | undefined;

      if (splatMeta && splatMeta[0]) {
        const metaData = splatMeta[0];
        metaString = Object.keys(metaData).length
          ? ` ${JSON.stringify(metaData)}`
          : '';
      }

      return `${timestamp} [${level}]: ${message} ${metaString} \n`;
    })
  ),
  transports: [
    // Log to the console
    new winston.transports.Console(),
    // Optionally, log to a file
    new winston.transports.File({
      filename: 'src/logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({ filename: 'src/logs/combined.log' })
  ]
});

export default logger;
