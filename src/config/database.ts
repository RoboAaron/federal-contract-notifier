import { PrismaClient } from '../generated/prisma';
import { createLogger } from '../utils/logger';

const logger = createLogger('Database');

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

interface PrismaQueryEvent {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
}

interface PrismaLogEvent {
  timestamp: Date;
  message: string;
  target: string;
}

// Log all queries in development
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e: PrismaQueryEvent) => {
    logger.debug('Query: ' + e.query);
    logger.debug('Duration: ' + e.duration + 'ms');
  });
}

// Log all errors
prisma.$on('error', (e: PrismaLogEvent) => {
  logger.error('Prisma Error: ' + e.message);
});

// Log all info messages
prisma.$on('info', (e: PrismaLogEvent) => {
  logger.info('Prisma Info: ' + e.message);
});

// Log all warnings
prisma.$on('warn', (e: PrismaLogEvent) => {
  logger.warn('Prisma Warning: ' + e.message);
});

// Handle application shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from database');
});

export async function setupDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to the database:', error);
    throw error;
  }
}

export default prisma; 