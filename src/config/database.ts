import { PrismaClient } from '../generated/prisma';
import { createLogger } from '../utils/logger';

const logger = createLogger('Database');

// Create a singleton instance of PrismaClient
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global variable to prevent multiple instances
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prisma = (global as any).prisma;
}

// Handle application shutdown - only disconnect once
let isDisconnecting = false;
process.on('beforeExit', async () => {
  if (!isDisconnecting) {
    isDisconnecting = true;
    await prisma.$disconnect();
    logger.info('Disconnected from database');
  }
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