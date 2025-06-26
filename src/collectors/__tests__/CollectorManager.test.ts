import { CollectorManager } from '../CollectorManager';
import { Opportunity } from '../../entities/Opportunity';
import { SamGovCollector } from '../SamGovCollector';
import { FboGovCollector } from '../FboGovCollector';

// Mock the collectors
jest.mock('../SamGovCollector');
jest.mock('../FboGovCollector');

describe('CollectorManager', () => {
  let collectorManager: CollectorManager;
  let mockSamOpportunities: Opportunity[];
  let mockFboOpportunities: Opportunity[];
  let mockSamCollector: any;
  let mockFboCollector: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock opportunities
    mockSamOpportunities = [
      {
        id: '1',
        title: 'SAM Opportunity 1',
        description: 'Test description 1',
        agency: 'Test Agency 1',
        department: 'Test Department 1',
        budget: 100000,
        publishDate: new Date(),
        dueDate: new Date(),
        status: 'new',
        sourceUrl: 'https://sam.gov/opp/1',
        createdAt: new Date(),
        updatedAt: new Date()
      } as Opportunity
    ];

    mockFboOpportunities = [
      {
        id: '2',
        title: 'FBO Opportunity 1',
        description: 'Test description 2',
        agency: 'Test Agency 2',
        department: 'Test Department 2',
        budget: 200000,
        publishDate: new Date(),
        dueDate: new Date(),
        status: 'new',
        sourceUrl: 'https://fbo.gov/opp/1',
        createdAt: new Date(),
        updatedAt: new Date()
      } as Opportunity
    ];

    // Setup mock collector instances
    mockSamCollector = { collect: jest.fn().mockResolvedValue(mockSamOpportunities) };
    mockFboCollector = { collect: jest.fn().mockResolvedValue(mockFboOpportunities) };

    collectorManager = new CollectorManager([mockSamCollector, mockFboCollector]);
  });

  describe('collectAll', () => {
    it('should collect opportunities from all sources', async () => {
      const opportunities = await collectorManager.collectAll();
      
      expect(opportunities).toHaveLength(2);
      expect(opportunities).toEqual(expect.arrayContaining([
        expect.objectContaining(mockSamOpportunities[0]),
        expect.objectContaining(mockFboOpportunities[0])
      ]));
    });

    it('should handle collector failures gracefully', async () => {
      // Make SAM collector fail
      mockSamCollector.collect.mockRejectedValue(new Error('SAM collector failed'));
      const collectorManager = new CollectorManager([mockSamCollector, mockFboCollector]);
      const opportunities = await collectorManager.collectAll();
      
      // Should still get FBO opportunities
      expect(opportunities).toHaveLength(1);
      expect(opportunities[0]).toEqual(expect.objectContaining(mockFboOpportunities[0]));
    });

    it('should deduplicate opportunities across sources', async () => {
      // Create duplicate opportunities
      const duplicateOpportunity = {
        ...mockSamOpportunities[0],
        id: '3',
        sourceUrl: 'https://fbo.gov/opp/duplicate'
      };
      mockFboCollector.collect.mockResolvedValue([duplicateOpportunity]);
      const collectorManager = new CollectorManager([mockSamCollector, mockFboCollector]);
      const opportunities = await collectorManager.collectAll();
      
      // Should only get one instance of the duplicate
      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].title).toBe(mockSamOpportunities[0].title);
    });
  });
}); 