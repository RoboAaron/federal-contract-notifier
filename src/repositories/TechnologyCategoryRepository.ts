import prisma from '../config/database';
import { createLogger } from '../utils/logger';

const logger = createLogger('TechnologyCategoryRepository');

export class TechnologyCategoryRepository {
  async create(data: any): Promise<any> {
    try {
      return await prisma.technologyCategory.create({
        data,
        include: {
          opportunities: true,
          salesReps: true,
        },
      });
    } catch (error) {
      logger.error('Error creating technology category:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<any | null> {
    try {
      return await prisma.technologyCategory.findUnique({
        where: { id },
        include: {
          opportunities: true,
          salesReps: true,
        },
      });
    } catch (error) {
      logger.error('Error finding technology category by ID:', error);
      throw error;
    }
  }

  async findByName(name: string): Promise<any | null> {
    try {
      return await prisma.technologyCategory.findUnique({
        where: { name },
        include: {
          opportunities: true,
          salesReps: true,
        },
      });
    } catch (error) {
      logger.error('Error finding technology category by name:', error);
      throw error;
    }
  }

  async findAll(): Promise<any[]> {
    try {
      return await prisma.technologyCategory.findMany({
        include: {
          opportunities: true,
          salesReps: true,
        },
      });
    } catch (error) {
      logger.error('Error finding all technology categories:', error);
      throw error;
    }
  }

  async update(
    id: string,
    data: any
  ): Promise<any> {
    try {
      return await prisma.technologyCategory.update({
        where: { id },
        data,
        include: {
          opportunities: true,
          salesReps: true,
        },
      });
    } catch (error) {
      logger.error('Error updating technology category:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.technologyCategory.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting technology category:', error);
      throw error;
    }
  }

  async findMatchingCategories(keywords: string[]): Promise<any[]> {
    try {
      return await prisma.technologyCategory.findMany({
        where: {
          keywords: {
            hasSome: keywords,
          },
        },
        include: {
          opportunities: true,
          salesReps: true,
        },
      });
    } catch (error) {
      logger.error('Error finding matching technology categories:', error);
      throw error;
    }
  }

  async findWithFilters(filters: any, options: any): Promise<any> {
    try {
      const { page = 1, limit = 50 } = options;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [categories, total] = await Promise.all([
        prisma.technologyCategory.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                opportunities: true,
                salesReps: true,
              },
            },
          },
        }),
        prisma.technologyCategory.count({ where })
      ]);

      return {
        data: categories,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding technology categories with filters:', error);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      return await prisma.technologyCategory.count();
    } catch (error) {
      logger.error('Error counting technology categories:', error);
      throw error;
    }
  }
} 