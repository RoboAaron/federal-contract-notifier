import { BaseCollector } from './BaseCollector';
import { Opportunity } from '../entities/Opportunity';
import { SamGovCollector } from './SamGovCollector';
import { FboGovCollector } from './FboGovCollector';
import { createLogger } from '../utils/logger';
import { OpportunityRepository } from '../repositories/OpportunityRepository';

export class CollectorManager {
  private collectors: BaseCollector[];
  private readonly logger = createLogger('CollectorManager');
  private readonly opportunityRepo = new OpportunityRepository();

  constructor(collectors?: BaseCollector[]) {
    // Allow dependency injection for testing
    this.collectors = collectors || [
      new SamGovCollector(),
      new FboGovCollector()
    ];
  }

  async collectAll(): Promise<Opportunity[]> {
    this.logger.info('Starting collection from all sources');
    const allOpportunities: Opportunity[] = [];

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
    const saved: Opportunity[] = [];
    for (const opp of deduplicated) {
      const exists = await this.opportunityRepo.findBySourceUrl(opp.sourceUrl);
      if (!exists) {
        try {
          await this.opportunityRepo.create({
            ...opp,
            sourceType: opp.sourceType || 'Unknown',
            postedDate: opp.publishDate,
            // Map or transform fields as needed for DB schema
            technologyCategories: {
              connectOrCreate: (opp.technologyTypes || []).map((cat: any) => ({
                where: { name: cat.name },
                create: { name: cat.name, description: cat.description || '', keywords: cat.keywords || [] }
              }))
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
}

export async function initializeDataCollectors() {
  const collectorManager = new CollectorManager();
  await collectorManager.collectAll();
} 