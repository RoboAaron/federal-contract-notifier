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

  async findById(id: string): Promise<any | null> {
    try {
      return await prisma.opportunity.findUnique({
        where: { id },
        include: {
          technologyCategories: true,
          notifiedSalesReps: true,
        },
      });
    } catch (error) {
      logger.error('Error finding opportunity by ID:', error);
      throw error;
    }
  }

  async findWithFilters(filters: any, options: any): Promise<any> {
    try {
      const { page = 1, limit = 20, sortBy = 'postedDate', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { agency: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.agency) {
        where.agency = { contains: filters.agency, mode: 'insensitive' };
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.minBudget !== undefined) {
        where.budget = { ...where.budget, gte: filters.minBudget };
      }

      if (filters.maxBudget !== undefined) {
        where.budget = { ...where.budget, lte: filters.maxBudget };
      }

      if (filters.technologyCategory) {
        where.technologyCategories = {
          some: {
            name: { contains: filters.technologyCategory, mode: 'insensitive' }
          }
        };
      }

      const [opportunities, total] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            technologyCategories: true,
          },
        }),
        prisma.opportunity.count({ where })
      ]);

      return {
        data: opportunities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding opportunities with filters:', error);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      return await prisma.opportunity.count();
    } catch (error) {
      logger.error('Error counting opportunities:', error);
      throw error;
    }
  }
} 