import 'reflect-metadata';
import { config } from 'dotenv';
import { createLogger } from './utils/logger';
import { setupDatabase } from './config/database';
import { startServer } from './server';
import { initializeDataCollectors } from './collectors';
import { setupNotificationSystem } from './notifications';
import cron from 'node-cron';
import { NotificationManager } from './notifications/NotificationManager';

// Load environment variables
config();

const logger = createLogger('main');

async function bootstrap() {
  try {
    logger.info('Starting Federal Contract Notifier...');

    // Initialize database
    await setupDatabase();
    logger.info('Database connection established');

    // Initialize data collectors
    await initializeDataCollectors();
    logger.info('Data collectors initialized');

    // Setup notification system
    await setupNotificationSystem();
    logger.info('Notification system initialized');

    // Start web server
    await startServer();
    logger.info('Server started successfully');

    // Schedule notifications
    scheduleNotifications();
    logger.info('Notifications scheduled');

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

function scheduleNotifications() {
  // Schedule notifications to run daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running scheduled notifications');
    const notificationManager = new NotificationManager();
    await notificationManager.notifyAllSalesRepsAboutRecentOpportunities();
  });
}

bootstrap(); 