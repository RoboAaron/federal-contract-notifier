import { BaseCollector } from './BaseCollector';
import { Opportunity } from '../entities/Opportunity';
import { SamGovCollector } from './SamGovCollector';
import { FboGovCollector } from './FboGovCollector';
import { WorkingCollector } from './WorkingCollector';
import { CsvCollector } from './CsvCollector';
import { createLogger } from '../utils/logger';
import { OpportunityRepository } from '../repositories/OpportunityRepository';

const logger = createLogger('CollectorManager');

export class CollectorManager {
  private collectors: BaseCollector[];
  private readonly logger = createLogger('CollectorManager');
  private readonly opportunityRepo = new OpportunityRepository();

  constructor() {
    this.collectors = [
      new CsvCollector(), // Process the large CSV file with real data
      // new WorkingCollector(), // Keep as backup
      // new SamGovCollector(),
      // new FboGovCollector()
    ];
  }

  async collectAll(): Promise<any[]> {
    this.logger.info('Starting collection from all sources');
    const allOpportunities: any[] = [];

    // Collect from each source in parallel
    const results = await Promise.allSettled(
      this.collectors.map(collector => this.collectFromSource(collector))
    );

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allOpportunities.push(...result.value);
        this.logger.info(`Successfully collected ${result.value.length} opportunities from ${this.getCollectorName(index)}`);
      } else {
        this.logger.error(`Failed to collect from ${this.getCollectorName(index)}:`, result.reason);
      }
    });

    // Deduplicate across all sources
    const deduplicated = await this.deduplicateAcrossSources(allOpportunities);
    this.logger.info(`Total unique opportunities collected: ${deduplicated.length}`);

    // Persist new opportunities to the database
    const saved: any[] = [];
    for (const opp of deduplicated) {
      const exists = await this.opportunityRepo.findBySourceUrl(opp.sourceUrl);
      if (!exists) {
        try {
          await this.opportunityRepo.create({
            ...opp,
            sourceType: opp.sourceType || 'Unknown',
            // The WorkingCollector already provides postedDate, no need to map
            technologyCategories: {
              connectOrCreate: [] // No technology categories for now
            }
          });
          saved.push(opp);
        } catch (err) {
          this.logger.error('Failed to save opportunity:', err);
        }
      }
    }
    return saved;
  }

  private async collectFromSource(collector: BaseCollector): Promise<Opportunity[]> {
    try {
      return await collector.collect();
    } catch (error) {
      this.logger.error(`Error collecting from ${collector.constructor.name}:`, error);
      throw error;
    }
  }

  private async deduplicateAcrossSources(opportunities: Opportunity[]): Promise<Opportunity[]> {
    const seen = new Set<string>();
    return opportunities.filter(opportunity => {
      // Create a unique key based on title and agency
      const key = `${opportunity.title.toLowerCase()}-${opportunity.agency.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private getCollectorName(index: number): string {
    return this.collectors[index].constructor.name;
  }

  async collectAndSave(): Promise<{ newOpportunities: any[], updatedOpportunities: any[] }> {
    try {
      this.logger.info('Starting collection from all sources');
      
      const allOpportunities: any[] = [];
      
      for (const collector of this.collectors) {
        try {
          const opportunities = await collector.collect();
          this.logger.info(`Successfully collected ${opportunities.length} opportunities from ${collector.constructor.name}`);
          allOpportunities.push(...opportunities);
        } catch (error) {
          this.logger.error(`Error collecting from ${collector.constructor.name}:`, error);
        }
      }

      // Remove duplicates based on sourceUrl (which contains the NoticeId for CSV data)
      const uniqueOpportunities = this.removeDuplicates(allOpportunities);
      this.logger.info(`Total unique opportunities collected: ${uniqueOpportunities.length}`);

      // Check for existing opportunities in database to avoid duplicates
      const existingOpportunities = await this.getExistingOpportunities(uniqueOpportunities);
      const existingMap = new Map(existingOpportunities.map((opp: any) => [opp.sourceUrl, opp]));
      const newOpportunities: any[] = [];
      const updatedOpportunities: any[] = [];

      for (const opportunity of uniqueOpportunities) {
        const existing = existingMap.get(opportunity.sourceUrl);
        if (!existing) {
          // New opportunity
          try {
            await this.saveOpportunity(opportunity);
            newOpportunities.push({ id: opportunity.id, title: opportunity.title, sourceUrl: opportunity.sourceUrl });
          } catch (error) {
            this.logger.error('Failed to save opportunity:', error);
          }
        } else {
          // Check for updates
          const changedFields: string[] = [];
          for (const key of Object.keys(opportunity)) {
            if (key === 'createdAt' || key === 'updatedAt') continue;
            if (typeof opportunity[key] === 'object') continue; // skip deep compare for now
            if (opportunity[key] !== existing[key]) {
              changedFields.push(key);
            }
          }
          if (changedFields.length > 0) {
            // Update the record
            try {
              await this.opportunityRepo.updateBySourceUrl(opportunity.sourceUrl, opportunity);
              updatedOpportunities.push({ id: existing.id, title: opportunity.title, sourceUrl: opportunity.sourceUrl, changedFields });
            } catch (error) {
              this.logger.error('Failed to update opportunity:', error);
            }
          }
        }
      }

      this.logger.info(`Found ${existingOpportunities.length} existing opportunities, ${newOpportunities.length} new opportunities to add, ${updatedOpportunities.length} updated opportunities.`);
      this.logger.info(`Successfully saved ${newOpportunities.length} new opportunities and updated ${updatedOpportunities.length} existing opportunities.`);

      return { newOpportunities, updatedOpportunities };
    } catch (error) {
      this.logger.error('Error in collectAndSave:', error);
      throw error;
    }
  }

  private removeDuplicates(opportunities: any[]): any[] {
    const seen = new Set();
    return opportunities.filter(opportunity => {
      // Use sourceUrl as unique identifier (contains NoticeId for CSV data)
      const key = opportunity.sourceUrl;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async getExistingOpportunities(opportunities: any[]): Promise<any[]> {
    const sourceUrls = opportunities.map(opp => opp.sourceUrl);
    return await this.opportunityRepo.findBySourceUrls(sourceUrls);
  }

  private async saveOpportunity(opportunity: Opportunity): Promise<void> {
    await this.opportunityRepo.create({
      ...opportunity,
      sourceType: opportunity.sourceType || 'Unknown',
      technologyCategories: {
        connectOrCreate: [] // No technology categories for now
      }
    });
  }
}

export async function initializeDataCollectors() {
  const collectorManager = new CollectorManager();
  await collectorManager.collectAll();
} 