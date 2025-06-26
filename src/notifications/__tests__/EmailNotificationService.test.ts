import { EmailNotificationService } from '../EmailNotificationService';
import { Opportunity } from '../../entities/Opportunity';
import { SalesRep } from '../../entities/SalesRep';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailNotificationService', () => {
  let emailService: EmailNotificationService;
  let mockTransporter: any;
  let mockSalesRep: SalesRep;
  let mockOpportunity: Opportunity;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Create test instances
    emailService = new EmailNotificationService();
    mockSalesRep = {
      id: '1',
      name: 'Test Sales Rep',
      email: 'test@example.com',
      notificationSettings: {
        email: true,
        phone: false,
        frequency: 'daily'
      }
    } as SalesRep;

    mockOpportunity = {
      id: '1',
      title: 'Test Opportunity',
      description: 'Test Description',
      agency: 'Test Agency',
      department: 'Test Department',
      budget: 100000,
      publishDate: new Date(),
      dueDate: new Date(),
      status: 'new',
      sourceUrl: 'https://example.com/opp/1'
    } as Opportunity;
  });

  describe('sendDailyDigest', () => {
    it('should send daily digest email', async () => {
      const opportunities = [mockOpportunity];
      await emailService.sendDailyDigest(mockSalesRep, opportunities);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockSalesRep.email,
          subject: expect.stringContaining('Federal Contract Opportunities Digest'),
          html: expect.stringContaining(mockOpportunity.title)
        })
      );
    });

    it('should handle email sending failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        emailService.sendDailyDigest(mockSalesRep, [mockOpportunity])
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('sendImmediateNotification', () => {
    it('should send immediate notification email', async () => {
      await emailService.sendImmediateNotification(mockSalesRep, mockOpportunity);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockSalesRep.email,
          subject: expect.stringContaining(mockOpportunity.title),
          html: expect.stringContaining(mockOpportunity.title)
        })
      );
    });

    it('should handle email sending failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        emailService.sendImmediateNotification(mockSalesRep, mockOpportunity)
      ).rejects.toThrow('SMTP error');
    });
  });
}); 