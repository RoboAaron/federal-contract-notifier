import pino from 'pino';
import path from 'path';

export function createLogger(name: string) {
  const logDir = path.join(process.cwd(), 'logs');
  
  // Create a file transport for all logs
  const fileTransport = pino.transport({
    target: 'pino/file',
    options: {
      destination: path.join(logDir, `${name}.log`),
      mkdir: true,
    },
  });

  // Create a pretty console transport for development
  const consoleTransport = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  });

  // Create a multi-transport logger
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
  }, pino.multistream([
    { stream: fileTransport },
    { stream: consoleTransport },
  ]));
} 