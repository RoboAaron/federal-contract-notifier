import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseCollector } from './BaseCollector';
import { Opportunity } from '../entities/Opportunity';

export class FboGovCollector extends BaseCollector {
  private readonly baseUrl = 'https://www.fbo.gov/index.php';

  async collect(): Promise<Opportunity[]> {
    try {
      this.logger.info('Starting FBO.gov data collection');
      
      const response = await axios.get(this.baseUrl, {
        params: {
          s: 'opportunity',
          mode: 'list',
          tab: 'list',
          tabmode: 'list',
          page: 1
        }
      });

      const $ = cheerio.load(response.data);
      const opportunities: Opportunity[] = [];

      // Process each opportunity listing
      $('.solnbr').each((index: number, element: cheerio.Element) => {
        const opportunity = this.processOpportunityFromHtml($, element);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      });

      const validOpportunities = (await Promise.all(
        opportunities.map(async opp => {
          const isValid = await this.validateOpportunity(opp);
          return isValid ? opp : null;
        })
      )).filter((opp): opp is Opportunity => opp !== null);

      const deduplicated = await this.deduplicateOpportunities(validOpportunities);
      
      this.logger.info(`Collected ${deduplicated.length} opportunities from FBO.gov`);
      return deduplicated;

    } catch (error) {
      this.logger.error('Error collecting from FBO.gov:', error);
      throw error;
    }
  }

  private processOpportunityFromHtml($: ReturnType<typeof cheerio.load>, element: cheerio.Element): Opportunity | null {
    try {
      const opportunity = new Opportunity();
      const $element = $(element);

      // Extract basic information
      opportunity.title = $element.find('.title').text().trim();
      opportunity.description = $element.find('.description').text().trim();
      opportunity.agency = $element.find('.agency').text().trim();
      opportunity.department = $element.find('.department').text().trim() || '';
      
      // Extract budget if available
      const budgetText = $element.find('.budget').text().trim();
      opportunity.budget = this.parseBudget(budgetText) || 0;

      // Extract dates
      const publishDateText = $element.find('.publish-date').text().trim();
      opportunity.publishDate = new Date(publishDateText);
      
      const dueDateText = $element.find('.due-date').text().trim();
      opportunity.dueDate = dueDateText ? new Date(dueDateText) : new Date();

      opportunity.status = 'new';
      
      // Extract source URL
      const noticeId = $element.find('.notice-id').text().trim();
      opportunity.sourceUrl = `https://www.fbo.gov/index.php?s=opportunity&mode=form&id=${noticeId}`;

      // Extract point of contact if available
      const contactName = $element.find('.contact-name').text().trim();
      const contactEmail = $element.find('.contact-email').text().trim();
      const contactPhone = $element.find('.contact-phone').text().trim();

      if (contactName || contactEmail || contactPhone) {
        opportunity.pointOfContact = {
          name: contactName || '',
          email: contactEmail || '',
          phone: contactPhone || ''
        };
      }

      // Store raw HTML for reference
      opportunity.rawData = {
        html: $element.html()
      };

      return opportunity;
    } catch (error) {
      this.logger.error('Error processing FBO opportunity:', error);
      return null;
    }
  }

  private parseBudget(value: string): number | null {
    if (!value) return null;
    
    // Remove currency symbols and commas
    const cleanValue = value.replace(/[$,]/g, '');
    
    // Try to parse the number
    const number = parseFloat(cleanValue);
    return isNaN(number) ? null : number;
  }
} 