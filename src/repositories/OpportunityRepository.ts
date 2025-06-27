import prisma from '../config/database';
import { createLogger } from '../utils/logger';

const logger = createLogger('OpportunityRepository');

export class OpportunityRepository {
  async create(data: any): Promise<any> {
    try {
      return await prisma.opportunity.create({
        data,
        include: {
          technologyCategories: true,
        },
      });
    } catch (error) {
      logger.error('Error creating opportunity:', error);
      throw error;
    }
  }

  async findBySourceUrl(sourceUrl: string): Promise<any | null> {
    try {
      return await prisma.opportunity.findUnique({
        where: { sourceUrl },
        include: {
          technologyCategories: true,
        },
      });
    } catch (error) {
      logger.error('Error finding opportunity by source URL:', error);
      throw error;
    }
  }

  async findBySourceUrls(sourceUrls: string[]): Promise<any[]> {
    try {
      return await prisma.opportunity.findMany({
        where: {
          sourceUrl: {
            in: sourceUrls,
          },
        },
        include: {
          technologyCategories: true,
        },
      });
    } catch (error) {
      logger.error('Error finding opportunities by source URLs:', error);
      throw error;
    }
  }

  async findRecent(limit: number = 100): Promise<any[]> {
    try {
      return await prisma.opportunity.findMany({
        take: limit,
        orderBy: { postedDate: 'desc' },
        include: {
          technologyCategories: true,
        },
      });
    } catch (error) {
      logger.error('Error finding recent opportunities:', error);
      throw error;
    }
  }

  async findMatchingForSalesRep(
    salesRepId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const salesRep = await prisma.salesRep.findUnique({
        where: { id: salesRepId },
        include: { technologyInterests: true },
      });

      if (!salesRep) {
        throw new Error(`Sales rep with ID ${salesRepId} not found`);
      }

      return await prisma.opportunity.findMany({
        where: {
          postedDate: {
            gte: startDate,
            lte: endDate,
          },
          budget: {
            gte: salesRep.minBudget || undefined,
            lte: salesRep.maxBudget || undefined,
          },
          technologyCategories: {
            some: {
              id: {
                in: salesRep.technologyInterests.map((tech: { id: string }) => tech.id),
              },
            },
          },
          NOT: {
            notifiedSalesReps: {
              some: {
                id: salesRepId,
              },
            },
          },
        },
        include: {
          technologyCategories: true,
        },
      });
    } catch (error) {
      logger.error('Error finding matching opportunities for sales rep:', error);
      throw error;
    }
  }

  async markAsNotified(opportunityId: string, salesRepId: string): Promise<void> {
    try {
      await prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
          notifiedSalesReps: {
            connect: { id: salesRepId },
          },
        },
      });
    } catch (error) {
      logger.error('Error marking opportunity as notified:', error);
      throw error;
    }
  }

  async deleteOldOpportunities(retentionMonths: number = 6): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

      const result = await prisma.opportunity.deleteMany({
        where: {
          postedDate: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      logger.error('Error deleting old opportunities:', error);
      throw error;
    }
  }

  async updateBySourceUrl(sourceUrl: string, data: any): Promise<any> {
    try {
      return await prisma.opportunity.update({
        where: { sourceUrl },
        data,
        include: {
          technologyCategories: true,
        },
      });
    } catch (error) {
      logger.error('Error updating opportunity:', error);
      throw error;
    }
  }
} 