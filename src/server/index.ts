import express from 'express';
import cors from 'cors';
import { createLogger } from '../utils/logger';
import { OpportunityRepository } from '../repositories/OpportunityRepository';
import { SalesRepRepository } from '../repositories/SalesRepRepository';
import { TechnologyCategoryRepository } from '../repositories/TechnologyCategoryRepository';

const logger = createLogger('Server');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve React build

// Initialize repositories
const opportunityRepo = new OpportunityRepository();
const salesRepRepo = new SalesRepRepository();
const technologyCategoryRepo = new TechnologyCategoryRepository();

export async function startServer() {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Opportunities API
  app.get('/api/opportunities', async (req, res) => {
    try {
      const {
        page = '1',
        limit = '20',
        search = '',
        agency = '',
        status = '',
        minBudget = '',
        maxBudget = '',
        sortBy = 'postedDate',
        sortOrder = 'desc',
        technologyCategory = ''
      } = req.query;

      const filters = {
        search: search as string,
        agency: agency as string,
        status: status as string,
        minBudget: minBudget ? parseFloat(minBudget as string) : undefined,
        maxBudget: maxBudget ? parseFloat(maxBudget as string) : undefined,
        technologyCategory: technologyCategory as string
      };

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await opportunityRepo.findWithFilters(filters, options);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
  });

  app.get('/api/opportunities/:id', async (req, res) => {
    try {
      const opportunity = await opportunityRepo.findById(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      res.json(opportunity);
    } catch (error) {
      logger.error('Error fetching opportunity:', error);
      res.status(500).json({ error: 'Failed to fetch opportunity' });
    }
  });

  // Sales Reps API
  app.get('/api/sales-reps', async (req, res) => {
    try {
      const {
        page = '1',
        limit = '20',
        search = '',
        region = '',
        isActive = ''
      } = req.query;

      const filters = {
        search: search as string,
        region: region as string,
        isActive: isActive ? isActive === 'true' : undefined
      };

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await salesRepRepo.findWithFilters(filters, options);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching sales reps:', error);
      res.status(500).json({ error: 'Failed to fetch sales reps' });
    }
  });

  // Technology Categories API
  app.get('/api/technology-categories', async (req, res) => {
    try {
      const {
        page = '1',
        limit = '50',
        search = ''
      } = req.query;

      const filters = {
        search: search as string
      };

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await technologyCategoryRepo.findWithFilters(filters, options);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching technology categories:', error);
      res.status(500).json({ error: 'Failed to fetch technology categories' });
    }
  });

  // Statistics API
  app.get('/api/stats', async (req, res) => {
    try {
      const [opportunityCount, salesRepCount, categoryCount] = await Promise.all([
        opportunityRepo.count(),
        salesRepRepo.count(),
        technologyCategoryRepo.count()
      ]);

      res.json({
        opportunities: opportunityCount,
        salesReps: salesRepCount,
        technologyCategories: categoryCount
      });
    } catch (error) {
      logger.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // Serve React app for all other routes
  app.get('*', (req, res) => {
    res.sendFile('public/index.html', { root: '.' });
  });

  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
} 