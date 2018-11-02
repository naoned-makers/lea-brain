import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new(winston.transports.Console)(),
    new(winston.transports.File)({filename: 'lea.log'})
  ]
});

export default logger;
