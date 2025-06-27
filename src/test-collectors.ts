import 'reflect-metadata';
import { config } from 'dotenv';
import { createLogger } from './utils/logger';
import { setupDatabase } from './config/database';
import { CollectorManager } from './collectors/CollectorManager';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'json2csv';

// Load environment variables
config();

const logger = createLogger('test-collectors');

function getReportFileName(ext: string) {
  const date = new Date().toISOString().slice(0, 10);
  return path.join('reports', `opportunity-delta-${date}.${ext}`);
}

async function testCollectors() {
  try {
    logger.info('Testing collectors and populating database...');
    
    // Connect to database
    await setupDatabase();
    logger.info('Database connection established');

    const collectorManager = new CollectorManager();
    
    // Use the new collectAndSave method with reporting
    const { newOpportunities, updatedOpportunities } = await collectorManager.collectAndSave();

    // Log counts only
    logger.info(`New opportunities added: ${newOpportunities.length}`);
    logger.info(`Updated opportunities: ${updatedOpportunities.length}`);

    // Write JSON report
    const report = {
      date: new Date().toISOString(),
      newOpportunities,
      updatedOpportunities
    };
    fs.writeFileSync(getReportFileName('json'), JSON.stringify(report, null, 2));
    logger.info(`JSON report written to ${getReportFileName('json')}`);

    // Write CSV report
    const csvRows = [
      ...newOpportunities.map(o => ({ type: 'new', id: o.id, title: o.title, sourceUrl: o.sourceUrl, changedFields: '' })),
      ...updatedOpportunities.map(o => ({ type: 'updated', id: o.id, title: o.title, sourceUrl: o.sourceUrl, changedFields: (o.changedFields || []).join(';') }))
    ];
    if (csvRows.length > 0) {
      const csv = parse(csvRows, { fields: ['type', 'id', 'title', 'sourceUrl', 'changedFields'] });
      fs.writeFileSync(getReportFileName('csv'), csv);
      logger.info(`CSV report written to ${getReportFileName('csv')}`);
    } else {
      logger.info('No new or updated opportunities to report.');
    }

    logger.info('Test completed successfully');
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

testCollectors(); 