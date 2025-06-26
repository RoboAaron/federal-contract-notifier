import { NotificationManager } from '../NotificationManager';
import { EmailNotificationService } from '../EmailNotificationService';
import { Opportunity } from '../../entities/Opportunity';
import { SalesRep } from '../../entities/SalesRep';
import { TechnologyCategory } from '../../entities/TechnologyCategory';

// Mock EmailNotificationService
jest.mock('../EmailNotificationService');

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;
  let mockEmailService: jest.Mocked<EmailNotificationService>;
  let mockSalesRep: SalesRep;
  let mockOpportunity: Opportunity;
  let mockTechnologyCategory: TechnologyCategory;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock email service
    mockEmailService = {
      sendDailyDigest: jest.fn().mockResolvedValue(undefined),
      sendImmediateNotification: jest.fn().mockResolvedValue(undefined)
    } as any;
    (EmailNotificationService as jest.Mock).mockImplementation(() => mockEmailService);

    // Create test instances
    notificationManager = new NotificationManager();
    mockTechnologyCategory = {
      id: '1',
      name: 'Cloud Computing',
      description: 'Cloud services and infrastructure',
      keywords: ['cloud', 'aws', 'azure']
    } as TechnologyCategory;

    mockSalesRep = {
      id: '1',
      name: 'Test Sales Rep',
      email: 'test@example.com',
      phone: '123-456-7890',
      regions: ['National'],
      minBudget: 50000,
      maxBudget: 200000,
      technologyInterests: [mockTechnologyCategory],
      notificationSettings: {
        email: true,
        phone: false,
        frequency: 'daily'
      },
      notifiedOpportunities: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as SalesRep;

    mockOpportunity = {
      id: '1',
      title: 'Test Opportunity',
      description: 'Test Description',
      agency: 'Department of Defense',
      department: 'Test Department',
      budget: 100000,
      publishDate: new Date(),
      dueDate: new Date(),
      status: 'new',
      sourceUrl: 'https://example.com/opp/1',
      technologyTypes: [mockTechnologyCategory]
    } as Opportunity;
  });

  describe('notifySalesReps', () => {
    it('should send daily digest when frequency is daily', async () => {
      await notificationManager.notifySalesReps([mockOpportunity], [mockSalesRep]);

      expect(mockEmailService.sendDailyDigest).toHaveBeenCalledWith(
        mockSalesRep,
        [mockOpportunity]
      );
      expect(mockEmailService.sendImmediateNotification).not.toHaveBeenCalled();
    });

    it('should send immediate notifications when frequency is weekly', async () => {
      mockSalesRep.notificationSettings.frequency = 'weekly';
      await notificationManager.notifySalesReps([mockOpportunity], [mockSalesRep]);

      expect(mockEmailService.sendImmediateNotification).toHaveBeenCalledWith(
        mockSalesRep,
        mockOpportunity
      );
      expect(mockEmailService.sendDailyDigest).not.toHaveBeenCalled();
    });

    it('should filter opportunities based on sales rep preferences', async () => {
      const opportunities = [
        mockOpportunity,
        {
          ...mockOpportunity,
          id: '2',
          budget: 300000 // Above max budget
        } as Opportunity,
        {
          ...mockOpportunity,
          id: '3',
          budget: 10000 // Below min budget
        } as Opportunity
      ];

      await notificationManager.notifySalesReps(opportunities, [mockSalesRep]);

      expect(mockEmailService.sendDailyDigest).toHaveBeenCalledWith(
        mockSalesRep,
        [mockOpportunity] // Only the matching opportunity
      );
    });

    it('should not notify about already notified opportunities', async () => {
      mockSalesRep.notifiedOpportunities = [mockOpportunity];
      await notificationManager.notifySalesReps([mockOpportunity], [mockSalesRep]);

      expect(mockEmailService.sendDailyDigest).not.toHaveBeenCalled();
      expect(mockEmailService.sendImmediateNotification).not.toHaveBeenCalled();
    });

    it('should handle notification failures gracefully', async () => {
      mockEmailService.sendDailyDigest.mockRejectedValue(new Error('Email error'));
      
      await notificationManager.notifySalesReps([mockOpportunity], [mockSalesRep]);
      
      // Should not throw error and continue processing
      expect(mockSalesRep.notifiedOpportunities).toHaveLength(0);
    });
  });
}); 