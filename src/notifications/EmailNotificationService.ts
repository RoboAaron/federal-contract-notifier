import nodemailer from 'nodemailer';
import { Opportunity } from '../entities/Opportunity';
import { SalesRep } from '../entities/SalesRep';
import { createLogger } from '../utils/logger';

export class EmailNotificationService {
  private transporter: nodemailer.Transporter;
  private readonly logger = createLogger('EmailNotificationService');

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendDailyDigest(salesRep: SalesRep, opportunities: Opportunity[]): Promise<void> {
    try {
      const html = this.generateDigestHtml(salesRep, opportunities);
      
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: salesRep.email,
        subject: `Federal Contract Opportunities Digest - ${new Date().toLocaleDateString()}`,
        html
      });

      this.logger.info(`Sent daily digest to ${salesRep.email} with ${opportunities.length} opportunities`);
    } catch (error) {
      this.logger.error(`Failed to send daily digest to ${salesRep.email}:`, error);
      throw error;
    }
  }

  async sendImmediateNotification(salesRep: SalesRep, opportunity: Opportunity): Promise<void> {
    try {
      const html = this.generateOpportunityHtml(opportunity);
      
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: salesRep.email,
        subject: `New Federal Contract Opportunity: ${opportunity.title}`,
        html
      });

      this.logger.info(`Sent immediate notification to ${salesRep.email} for opportunity ${opportunity.id}`);
    } catch (error) {
      this.logger.error(`Failed to send immediate notification to ${salesRep.email}:`, error);
      throw error;
    }
  }

  private generateDigestHtml(salesRep: SalesRep, opportunities: Opportunity[]): string {
    const opportunityHtml = opportunities.map(opp => this.generateOpportunityHtml(opp)).join('<hr>');
    
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .opportunity { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .header { background-color: #f5f5f5; padding: 10px; margin-bottom: 20px; }
            .budget { color: #2c5282; font-weight: bold; }
            .due-date { color: #c53030; }
            .contact { background-color: #ebf8ff; padding: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Federal Contract Opportunities Digest</h1>
            <p>Hello ${salesRep.name},</p>
            <p>Here are the latest federal contract opportunities matching your interests:</p>
          </div>
          ${opportunityHtml}
          <hr>
          <p>You received this email because you are subscribed to federal contract notifications.</p>
          <p>To update your preferences, please contact your administrator.</p>
        </body>
      </html>
    `;
  }

  private generateOpportunityHtml(opportunity: Opportunity): string {
    return `
      <div class="opportunity">
        <h2>${opportunity.title}</h2>
        <p><strong>Agency:</strong> ${opportunity.agency}</p>
        <p><strong>Department:</strong> ${opportunity.department}</p>
        ${opportunity.budget ? `<p><strong>Budget:</strong> <span class="budget">$${opportunity.budget.toLocaleString()}</span></p>` : ''}
        <p><strong>Publish Date:</strong> ${opportunity.publishDate.toLocaleDateString()}</p>
        ${opportunity.dueDate ? `<p><strong>Due Date:</strong> <span class="due-date">${opportunity.dueDate.toLocaleDateString()}</span></p>` : ''}
        <p><strong>Description:</strong></p>
        <p>${opportunity.description}</p>
        ${opportunity.pointOfContact ? `
          <div class="contact">
            <h3>Point of Contact</h3>
            <p><strong>Name:</strong> ${opportunity.pointOfContact.name}</p>
            ${opportunity.pointOfContact.email ? `<p><strong>Email:</strong> ${opportunity.pointOfContact.email}</p>` : ''}
            ${opportunity.pointOfContact.phone ? `<p><strong>Phone:</strong> ${opportunity.pointOfContact.phone}</p>` : ''}
          </div>
        ` : ''}
        <p><a href="${opportunity.sourceUrl}" target="_blank">View Full Details</a></p>
      </div>
    `;
  }
} 