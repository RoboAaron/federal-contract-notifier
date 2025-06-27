import 'reflect-metadata';
import { config } from 'dotenv';
import { createLogger } from './utils/logger';
import { setupDatabase } from './config/database';
import { OpportunityRepository } from './repositories/OpportunityRepository';
import { SalesRepRepository } from './repositories/SalesRepRepository';
import { TechnologyCategoryRepository } from './repositories/TechnologyCategoryRepository';
import { NotificationManager } from './notifications/NotificationManager';

// Load environment variables
config();

const logger = createLogger('test-sample-data');

/**
 * METHODOLOGY: Find-or-Create Pattern
 * 
 * This test script demonstrates the "find or create" pattern, which is essential for:
 * 1. **Idempotency**: Script can be run multiple times without errors
 * 2. **Data Integrity**: Prevents duplicate entities
 * 3. **Real-world Usage**: Mirrors how the actual system should work
 * 
 * TECHNIQUE: Entity Lifecycle Management
 * - Technology Categories: Long-lived, reusable across opportunities and sales reps
 * - Sales Representatives: Persistent entities with evolving interests
 * - Opportunities: New entities that reference existing categories
 * 
 * PATTERN: For each entity type:
 * 1. Check if entity exists using unique identifier
 * 2. If exists: use existing entity
 * 3. If not exists: create new entity
 * 4. Use entity ID for associations
 */

async function findOrCreateTechnologyCategory(
  techRepo: TechnologyCategoryRepository,
  name: string,
  description: string,
  keywords: string[]
) {
  // Check if category already exists
  let category = await techRepo.findByName(name);
  
  if (!category) {
    logger.info(`Creating new technology category: ${name}`);
    category = await techRepo.create({
      name,
      description,
      keywords
    });
  } else {
    logger.info(`Using existing technology category: ${name}`);
  }
  
  return category;
}

async function findOrCreateSalesRep(
  salesRepo: SalesRepRepository,
  email: string,
  name: string,
  phone: string,
  regions: string[],
  notificationSettings: any,
  technologyCategoryIds: string[]
) {
  // Check if sales rep already exists
  let salesRep = await salesRepo.findByEmail(email);
  
  if (!salesRep) {
    logger.info(`Creating new sales rep: ${name} (${email})`);
    salesRep = await salesRepo.create({
      name,
      email,
      phone,
      regions,
      notificationSettings,
      technologyInterests: {
        connect: technologyCategoryIds.map(id => ({ id }))
      }
    });
  } else {
    logger.info(`Using existing sales rep: ${name} (${email})`);
    // Update technology interests if needed
    for (const techId of technologyCategoryIds) {
      await salesRepo.addTechnologyInterest(salesRep.id, techId);
    }
  }
  
  return salesRep;
}

async function findOrCreateOpportunity(
  oppRepo: OpportunityRepository,
  sourceUrl: string,
  opportunityData: any,
  technologyCategoryIds: string[]
) {
  // Check if opportunity already exists
  let opportunity = await oppRepo.findBySourceUrl(sourceUrl);
  
  if (!opportunity) {
    logger.info(`Creating new opportunity: ${opportunityData.title}`);
    opportunity = await oppRepo.create({
      ...opportunityData,
      sourceUrl,
      technologyCategories: {
        connect: technologyCategoryIds.map(id => ({ id }))
      }
    });
  } else {
    logger.info(`Using existing opportunity: ${opportunityData.title}`);
  }
  
  return opportunity;
}

async function testSampleData() {
  try {
    logger.info('Testing with sample data using find-or-create pattern...');

    // Initialize database
    await setupDatabase();
    logger.info('Database connection established');

    // Initialize repositories
    const techRepo = new TechnologyCategoryRepository();
    const salesRepo = new SalesRepRepository();
    const oppRepo = new OpportunityRepository();

    // STEP 1: Find or Create Technology Categories
    // These are long-lived entities that should be reused
    const aiCategory = await findOrCreateTechnologyCategory(
      techRepo,
      'Artificial Intelligence',
      'AI and machine learning technologies',
      ['AI', 'machine learning', 'ML', 'artificial intelligence']
    );
    
    const cloudCategory = await findOrCreateTechnologyCategory(
      techRepo,
      'Cloud Computing',
      'Cloud infrastructure and services',
      ['cloud', 'AWS', 'Azure', 'GCP', 'infrastructure']
    );

    logger.info('Technology categories ready');

    // STEP 2: Find or Create Sales Representatives
    // These are persistent entities with evolving interests
    const salesRep1 = await findOrCreateSalesRep(
      salesRepo,
      'john.smith@company.com',
      'John Smith',
      '555-0101',
      ['Northeast'],
      {
        frequency: 'daily',
        preferredTime: '08:00',
        digestFormat: true,
        immediateAlerts: false
      },
      [aiCategory.id, cloudCategory.id]
    );

    const salesRep2 = await findOrCreateSalesRep(
      salesRepo,
      'jane.doe@company.com',
      'Jane Doe',
      '555-0102',
      ['West Coast'],
      {
        frequency: 'daily',
        preferredTime: '09:00',
        digestFormat: true,
        immediateAlerts: true
      },
      [aiCategory.id]
    );

    logger.info('Sales representatives ready');

    // STEP 3: Find or Create Opportunities
    // These are new entities that reference existing categories
    const opportunity1 = await findOrCreateOpportunity(
      oppRepo,
      'https://sam.gov/opp/123456/view',
      {
        title: 'AI-Powered Data Analytics Platform',
        description: 'Development of an AI-powered data analytics platform for federal agencies',
        agency: 'Department of Defense',
        budget: 2500000,
        postedDate: new Date('2025-06-25'),
        dueDate: new Date('2025-07-25'),
        status: 'new',
        sourceType: 'SAM.gov',
        pointOfContact: {
          name: 'Dr. Robert Johnson',
          email: 'robert.johnson@darpa.mil',
          phone: '555-0201'
        }
      },
      [aiCategory.id]
    );

    const opportunity2 = await findOrCreateOpportunity(
      oppRepo,
      'https://sam.gov/opp/123457/view',
      {
        title: 'Cloud Infrastructure Modernization',
        description: 'Modernization of legacy systems to cloud-based infrastructure',
        agency: 'General Services Administration',
        budget: 1500000,
        postedDate: new Date('2025-06-24'),
        dueDate: new Date('2025-07-24'),
        status: 'new',
        sourceType: 'SAM.gov',
        pointOfContact: {
          name: 'Sarah Williams',
          email: 'sarah.williams@gsa.gov',
          phone: '555-0202'
        }
      },
      [cloudCategory.id]
    );

    logger.info('Opportunities ready');

    // STEP 4: Test Notification System
    // This demonstrates the end-to-end workflow
    const notificationManager = new NotificationManager();
    await notificationManager.notifyAllSalesRepsAboutRecentOpportunities();
    
    logger.info('Sent notifications to sales representatives');

    logger.info('Sample data test completed successfully - system is working end-to-end');
    process.exit(0);
  } catch (error) {
    logger.error('Sample data test failed:', error);
    process.exit(1);
  }
}

testSampleData(); 