import { Opportunity } from '../entities/Opportunity';
import { createLogger } from '../utils/logger';

export abstract class BaseCollector {
  protected logger = createLogger(this.constructor.name);

  abstract collect(): Promise<Opportunity[]>;
  
  protected async processOpportunity(rawData: any): Promise<Opportunity> {
    // This method should be implemented by specific collectors
    // to transform raw data into our Opportunity entity
    throw new Error('processOpportunity must be implemented by collector');
  }

  protected async validateOpportunity(opportunity: Opportunity): Promise<boolean> {
    // Basic validation that all collectors should perform
    if (!opportunity.title || !opportunity.description || !opportunity.agency) {
      this.logger.warn('Invalid opportunity data:', opportunity);
      return false;
    }
    return true;
  }

  protected async deduplicateOpportunities(opportunities: Opportunity[]): Promise<Opportunity[]> {
    // Implement deduplication logic based on source URL or other unique identifiers
    const seen = new Set<string>();
    return opportunities.filter(opp => {
      const key = opp.sourceUrl;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
} 