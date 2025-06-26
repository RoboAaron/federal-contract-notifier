import { Opportunity } from '../entities/Opportunity';
import { SalesRep } from '../entities/SalesRep';
import { EmailNotificationService } from './EmailNotificationService';
import { createLogger } from '../utils/logger';
import { OpportunityRepository } from '../repositories/OpportunityRepository';
import { SalesRepRepository } from '../repositories/SalesRepRepository';

export class NotificationManager {
  private readonly emailService: EmailNotificationService;
  private readonly logger = createLogger('NotificationManager');
  private readonly opportunityRepo = new OpportunityRepository();
  private readonly salesRepRepo = new SalesRepRepository();

  constructor() {
    this.emailService = new EmailNotificationService();
  }

  // New method: fetch from DB and notify
  async notifyAllSalesRepsAboutRecentOpportunities(): Promise<void> {
    this.logger.info('Fetching sales reps and recent opportunities from database');
    const salesReps = await this.salesRepRepo.findAll();
    const opportunities = await this.opportunityRepo.findRecent(100); // or another limit
    await this.notifySalesReps(opportunities, salesReps);
  }

  async notifySalesReps(opportunities: Opportunity[], salesReps: SalesRep[]): Promise<void> {
    this.logger.info(`Notifying ${salesReps.length} sales reps about ${opportunities.length} opportunities`);

    for (const salesRep of salesReps) {
      try {
        const matchingOpportunities = this.filterOpportunitiesForSalesRep(opportunities, salesRep);
        
        if (matchingOpportunities.length === 0) {
          this.logger.debug(`No matching opportunities for ${salesRep.email}`);
          continue;
        }

        if (salesRep.notificationSettings.frequency === 'daily') {
          await this.emailService.sendDailyDigest(salesRep, matchingOpportunities);
        } else {
          // For immediate notifications, send each opportunity separately
          for (const opportunity of matchingOpportunities) {
            await this.emailService.sendImmediateNotification(salesRep, opportunity);
          }
        }

        // Update notified opportunities (optional: persist to DB)
        salesRep.notifiedOpportunities.push(...matchingOpportunities);
        // Optionally, mark as notified in DB here
        // for (const opp of matchingOpportunities) {
        //   await this.opportunityRepo.markAsNotified(opp.id, salesRep.id);
        // }
        
      } catch (error) {
        this.logger.error(`Failed to notify sales rep ${salesRep.email}:`, error);
        // Continue with other sales reps even if one fails
      }
    }
  }

  private filterOpportunitiesForSalesRep(opportunities: Opportunity[], salesRep: SalesRep): Opportunity[] {
    return opportunities.filter(opportunity => {
      // Check if already notified
      if (salesRep.notifiedOpportunities.some(notified => notified.id === opportunity.id)) {
        return false;
      }

      // Check budget range
      if (salesRep.minBudget && opportunity.budget < salesRep.minBudget) {
        return false;
      }
      if (salesRep.maxBudget && opportunity.budget > salesRep.maxBudget) {
        return false;
      }

      // Check technology interests
      if (salesRep.technologyInterests.length > 0) {
        const hasMatchingTechnology = opportunity.technologyTypes.some(tech =>
          salesRep.technologyInterests.some(interest => interest.id === tech.id)
        );
        if (!hasMatchingTechnology) {
          return false;
        }
      }

      // Check regions if specified
      if (salesRep.regions.length > 0) {
        // This is a simplified check - you might want to implement more sophisticated
        // region matching based on your requirements
        const opportunityRegion = this.extractRegionFromAgency(opportunity.agency);
        if (!salesRep.regions.includes(opportunityRegion)) {
          return false;
        }
      }

      return true;
    });
  }

  private extractRegionFromAgency(agency: string): string {
    // This is a simplified implementation - you might want to implement more sophisticated
    // region extraction based on your requirements
    const regionMap: { [key: string]: string } = {
      'Department of Defense': 'National',
      'Department of Energy': 'National',
      'Department of Health and Human Services': 'National',
      'Department of Homeland Security': 'National',
      'Department of Transportation': 'National',
      'Department of Veterans Affairs': 'National',
      // Add more mappings as needed
    };

    return regionMap[agency] || 'Other';
  }
}

export async function setupNotificationSystem() {
  const notificationManager = new NotificationManager();
  await notificationManager.notifyAllSalesRepsAboutRecentOpportunities();
} 