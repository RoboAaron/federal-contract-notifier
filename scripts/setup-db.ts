import { execSync } from 'child_process';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('DatabaseSetup');

async function setupDatabase() {
  try {
    logger.info('Creating database...');
    execSync('npx prisma db push', { stdio: 'inherit' });

    logger.info('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    logger.info('Database setup completed successfully!');
  } catch (error) {
    logger.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase(); 