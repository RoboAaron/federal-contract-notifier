import axios from 'axios';
import { BaseCollector } from './BaseCollector';
import { Opportunity } from '../entities/Opportunity';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parse } from 'csv-parse';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

export class SamGovCollector extends BaseCollector {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.sam.gov/opportunities/v2/search';
  private readonly dataServicesUrl = 'https://sam.gov/data-services/Contract%20Opportunities/datagov?privacy=Public';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private readonly defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  };

  constructor() {
    super();
    this.apiKey = process.env.SAM_API_KEY || '';
  }

  async collect(): Promise<Opportunity[]> {
    try {
      this.logger.info('Starting SAM.gov data collection');
      // Use CSV method if no API key is available
      if (!this.apiKey) {
        return await this.collectFromCsv();
      }
      return await this.collectFromApi();
    } catch (error) {
      this.logger.error('Error collecting from SAM.gov:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        this.logger.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  private async getLatestCsvUrl(): Promise<string> {
    this.logger.info(`Fetching Data Services page with Puppeteer: ${this.dataServicesUrl}`);
    
    let browser;
    try {
      // Launch browser in non-headless mode so we can see what's happening
      browser = await puppeteer.launch({
        headless: false, // Show the browser window
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the page
      await page.goto(this.dataServicesUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Look for CSV download links with improved detection
      const csvLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const csvLinks: string[] = [];
        
        links.forEach(link => {
          const href = link.getAttribute('href');
          const text = link.textContent?.trim() || '';
          const title = link.getAttribute('title') || '';
          
          // More comprehensive CSV link detection
          if (href && (
            href.toLowerCase().includes('contractopportunities') && 
            href.toLowerCase().endsWith('.csv') ||
            href.toLowerCase().includes('csv') && 
            (text.toLowerCase().includes('download') || text.toLowerCase().includes('csv')) ||
            text.toLowerCase().includes('contract opportunities') && 
            text.toLowerCase().includes('csv') ||
            title.toLowerCase().includes('csv') ||
            href.toLowerCase().includes('data') && href.toLowerCase().includes('csv')
          )) {
            const fullUrl = href.startsWith('http') ? href : `https://sam.gov${href}`;
            csvLinks.push(fullUrl);
          }
        });
        
        return csvLinks;
      });
      
      this.logger.info(`Found ${csvLinks.length} potential CSV links`);
      
      if (csvLinks.length > 0) {
        // Sort by URL to get the most recent (assuming newer files have newer timestamps in URL)
        csvLinks.sort().reverse();
        const latestCsvUrl = csvLinks[0];
        this.logger.info(`Found latest CSV URL: ${latestCsvUrl}`);
        return latestCsvUrl;
      }
      
      // If no direct CSV links found, try to find download buttons or sections
      const downloadButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, .btn, [role="button"]'));
        const downloadButtons: string[] = [];
        
        buttons.forEach(button => {
          const text = button.textContent?.trim() || '';
          const onclick = button.getAttribute('onclick') || '';
          
          if (text.toLowerCase().includes('download') || 
              text.toLowerCase().includes('csv') ||
              onclick.toLowerCase().includes('download')) {
            downloadButtons.push(text);
          }
        });
        
        return downloadButtons;
      });
      
      this.logger.debug('Found download buttons:', downloadButtons);
      
      // Save page screenshot for debugging
      await page.screenshot({ path: 'logs/sam-gov-page.png', fullPage: true });
      
      // Save page HTML for debugging
      const pageHtml = await page.content();
      fs.writeFileSync(path.join(process.cwd(), 'logs', 'sam-gov-page-rendered.html'), pageHtml);
      
      throw new Error('No CSV links found on the page after JavaScript rendering');
      
    } catch (error) {
      this.logger.error('Failed to get CSV URL with Puppeteer:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async collectFromCsv(): Promise<Opportunity[]> {
    try {
      this.logger.info('Collecting data from SAM.gov CSV file');
      
      // Step 1: Get the latest CSV file URL
      const csvUrl = await this.getLatestCsvUrl();
      
      // Step 2: Download the CSV file with retries
      this.logger.info(`Attempting to download CSV from: ${csvUrl}`);
      let response;
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          response = await axios.get(csvUrl, {
            responseType: 'stream',
            headers: {
              ...this.defaultHeaders,
              'Accept': 'text/csv'
            },
            maxRedirects: 5
          });
          break;
        } catch (error) {
          if (attempt === this.maxRetries) {
            throw error;
          }
          this.logger.warn(`Download attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
      
      if (!response) {
        throw new Error('Failed to download CSV file after all retries');
      }

      this.logger.info('CSV download successful, creating temporary file');
      
      // Step 3: Create a temporary file
      const tempFile = path.join(os.tmpdir(), `sam-opportunities-${Date.now()}.csv`);
      const writer = fs.createWriteStream(tempFile);
      
      // Wait for the file to be written
      await new Promise<void>((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', () => resolve());
        writer.on('error', (err) => {
          this.logger.error('Error writing temporary file:', err);
          reject(err);
        });
      });
      
      this.logger.info(`Temporary file created at: ${tempFile}`);
      
      // Step 4: Parse the CSV file
      const opportunities: Opportunity[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      const fileStream = fs.createReadStream(tempFile);
      await new Promise<void>((resolve, reject) => {
        fileStream
          .pipe(parser)
          .on('data', async (record) => {
            try {
              const opportunity = await this.processOpportunity(record);
              if (opportunity) {
                opportunities.push(opportunity);
              }
            } catch (error) {
              this.logger.warn('Error processing record:', error);
            }
          })
          .on('end', () => resolve())
          .on('error', reject);
      });
      
      // Clean up the temporary file
      fs.unlinkSync(tempFile);
      
      const validOpportunities = (await Promise.all(
        opportunities.map(async opp => {
          const isValid = await this.validateOpportunity(opp);
          return isValid ? opp : null;
        })
      )).filter((opp): opp is Opportunity => opp !== null);
      
      const deduplicated = await this.deduplicateOpportunities(validOpportunities);
      this.logger.info(`Collected ${deduplicated.length} opportunities from SAM.gov CSV`);
      return deduplicated;
      
    } catch (error) {
      this.logger.error('Error collecting from SAM.gov CSV:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        this.logger.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  private async collectFromApi(): Promise<Opportunity[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          postedFrom: this.getDateRange().from,
          postedTo: this.getDateRange().to,
          limit: 100,
          status: 'active'
        }
      });
      const opportunities = await Promise.all(
        response.data.opportunitiesData.map((raw: any) => this.processOpportunity(raw))
      );
      const validOpportunities = (await Promise.all(
        opportunities.map(async opp => {
          const isValid = await this.validateOpportunity(opp);
          return isValid ? opp : null;
        })
      )).filter((opp): opp is Opportunity => opp !== null);
      const deduplicated = await this.deduplicateOpportunities(validOpportunities);
      this.logger.info(`Collected ${deduplicated.length} opportunities from SAM.gov API`);
      return deduplicated;
    } catch (error) {
      this.logger.error('Error collecting from SAM.gov API:', error);
      throw error;
    }
  }

  protected async processOpportunity(rawData: any): Promise<Opportunity> {
    const opportunity = new Opportunity();
    // Handle both API and CSV data formats
    if (rawData.noticeId) {
      // API format
      opportunity.title = rawData.title;
      opportunity.description = rawData.description;
      opportunity.agency = rawData.agency;
      opportunity.department = rawData.department || '';
      opportunity.budget = this.parseBudget(rawData.estimatedValue) || 0;
      opportunity.publishDate = new Date(rawData.postedDate);
      opportunity.dueDate = rawData.responseDeadLine ? new Date(rawData.responseDeadLine) : new Date();
      opportunity.status = 'new';
      opportunity.sourceUrl = `https://sam.gov/opp/${rawData.noticeId}/view`;
    } else {
      // CSV format
      opportunity.title = rawData.title || rawData.noticeTitle;
      opportunity.description = rawData.description || rawData.noticeDescription;
      opportunity.agency = rawData.agency || rawData.contractingAgency;
      opportunity.department = rawData.department || '';
      opportunity.budget = this.parseBudget(rawData.estimatedValue) || 0;
      opportunity.publishDate = new Date(rawData.postedDate || rawData.noticeDate);
      opportunity.dueDate = rawData.responseDeadLine ? new Date(rawData.responseDeadLine) : new Date();
      opportunity.status = 'new';
      opportunity.sourceUrl = `https://sam.gov/opp/${rawData.noticeId || rawData.noticeNumber}/view`;
    }
    opportunity.rawData = rawData;
    if (rawData.pointOfContact) {
      opportunity.pointOfContact = {
        name: rawData.pointOfContact.fullName || '',
        email: rawData.pointOfContact.email || '',
        phone: rawData.pointOfContact.phone || ''
      };
    }
    return opportunity;
  }

  private getDateRange() {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 1); // Get opportunities from the last 24 hours
    return {
      from: from.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    };
  }

  private parseBudget(value: string | number): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    // Remove currency symbols and commas
    const cleanValue = value.replace(/[$,]/g, '');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }
} 