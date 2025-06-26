import { SamGovCollector } from './collectors/SamGovCollector';
import { OpportunityRepository } from './repositories/OpportunityRepository';
import { createLogger } from './utils/logger';

const logger = createLogger('TestCsvCollector');

async function testCsvCollection() {
  try {
    logger.info('Starting CSV collection test');
    
    // Initialize collector and repository
    const collector = new SamGovCollector();
    const repository = new OpportunityRepository();
    
    // Collect opportunities
    logger.info('Collecting opportunities from CSV...');
    const opportunities = await collector.collect();
    logger.info(`Collected ${opportunities.length} opportunities`);
    
    // Store opportunities in database
    logger.info('Storing opportunities in database...');
    for (const opportunity of opportunities) {
      try {
        await repository.create(opportunity);
        logger.info(`Stored opportunity: ${opportunity.title}`);
      } catch (error) {
        logger.error(`Error storing opportunity ${opportunity.title}:`, error);
      }
    }
    
    // Verify stored opportunities
    const recentOpportunities = await repository.findRecent(5);
    logger.info('Recent opportunities in database:', recentOpportunities);
    
    logger.info('CSV collection test completed successfully');
  } catch (error) {
    logger.error('Error during CSV collection test:', error);
    process.exit(1);
  }
}

// Run the test
testCsvCollection(); 