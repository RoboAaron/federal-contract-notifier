import prisma from '../config/database';
import { createLogger } from '../utils/logger';

const logger = createLogger('SalesRepRepository');

export class SalesRepRepository {
  async create(data: any): Promise<any> {
    try {
      return await prisma.salesRep.create({
        data,
        include: {
          technologyInterests: true,
          notifiedOpportunities: true,
        },
      });
    } catch (error) {
      logger.error('Error creating sales rep:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<any | null> {
    try {
      return await prisma.salesRep.findUnique({
        where: { id },
        include: {
          technologyInterests: true,
          notifiedOpportunities: true,
        },
      });
    } catch (error) {
      logger.error('Error finding sales rep by ID:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<any | null> {
    try {
      return await prisma.salesRep.findUnique({
        where: { email },
        include: {
          technologyInterests: true,
          notifiedOpportunities: true,
        },
      });
    } catch (error) {
      logger.error('Error finding sales rep by email:', error);
      throw error;
    }
  }

  async findAll(): Promise<any[]> {
    try {
      return await prisma.salesRep.findMany({
        include: {
          technologyInterests: true,
          notifiedOpportunities: true,
        },
      });
    } catch (error) {
      logger.error('Error finding all sales reps:', error);
      throw error;
    }
  }

  async update(
    id: string,
    data: any
  ): Promise<any> {
    try {
      return await prisma.salesRep.update({
        where: { id },
        data,
        include: {
          technologyInterests: true,
          notifiedOpportunities: true,
        },
      });
    } catch (error) {
      logger.error('Error updating sales rep:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.salesRep.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting sales rep:', error);
      throw error;
    }
  }

  async addTechnologyInterest(
    salesRepId: string,
    technologyCategoryId: string
  ): Promise<any> {
    try {
      return await prisma.salesRep.update({
        where: { id: salesRepId },
        data: {
          technologyInterests: {
            connect: { id: technologyCategoryId },
          },
        },
        include: {
          technologyInterests: true,
          notifiedOpportunities: true,
        },
      });
    } catch (error) {
      logger.error('Error adding technology interest:', error);
      throw error;
    }
  }

  async removeTechnologyInterest(
    salesRepId: string,
    technologyCategoryId: string
  ): Promise<any> {
    try {
      return await prisma.salesRep.update({
        where: { id: salesRepId },
        data: {
          technologyInterests: {
            disconnect: { id: technologyCategoryId },
          },
        },
        include: {
          technologyInterests: true,
          notifiedOpportunities: true,
        },
      });
    } catch (error) {
      logger.error('Error removing technology interest:', error);
      throw error;
    }
  }

  async findWithFilters(filters: any, options: any): Promise<any> {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.region) {
        where.regions = {
          has: filters.region
        };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const [salesReps, total] = await Promise.all([
        prisma.salesRep.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          include: {
            technologyInterests: true,
          },
        }),
        prisma.salesRep.count({ where })
      ]);

      return {
        data: salesReps,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding sales reps with filters:', error);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      return await prisma.salesRep.count();
    } catch (error) {
      logger.error('Error counting sales reps:', error);
      throw error;
    }
  }
} 