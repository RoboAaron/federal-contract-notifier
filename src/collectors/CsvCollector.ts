import { BaseCollector } from './BaseCollector';
import { Opportunity } from '../entities/Opportunity';
import { createLogger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';

const logger = createLogger('CsvCollector');

/**
 * CSV Collector for SAM.gov Data
 * 
 * This collector processes the large CSV file downloaded from SAM.gov
 * and extracts real federal contract opportunities.
 */
export class CsvCollector extends BaseCollector {
  private readonly csvFilePath: string;
  private readonly maxOpportunities: number;

  constructor(csvFilePath?: string, maxOpportunities?: number) {
    super();
    this.csvFilePath = csvFilePath || path.join(process.cwd(), 'ContractOpportunitiesFullCSV.csv');
    this.maxOpportunities = maxOpportunities ?? Number.MAX_SAFE_INTEGER; // No limit for full import
  }

  async collect(): Promise<any[]> {
    try {
      logger.info(`Starting CSV data collection from: ${this.csvFilePath}`);
      
      if (!fs.existsSync(this.csvFilePath)) {
        throw new Error(`CSV file not found: ${this.csvFilePath}`);
      }

      const opportunities = await this.processCsvFile();
      
      logger.info(`Collected ${opportunities.length} opportunities from CSV file`);
      return opportunities;
      
    } catch (error) {
      logger.error('Error collecting from CSV file:', error);
      throw error;
    }
  }

  private async processCsvFile(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const opportunities: any[] = [];
      let processedCount = 0;

      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const fileStream = fs.createReadStream(this.csvFilePath);
      
      fileStream
        .pipe(parser)
        .on('data', (record) => {
          try {
            // Limit the number of opportunities for testing
            if (processedCount >= this.maxOpportunities) {
              return;
            }

            const opportunity = this.processCsvRecord(record);
            if (opportunity) {
              opportunities.push(opportunity);
              processedCount++;
            }
          } catch (error) {
            logger.warn('Error processing CSV record:', error);
          }
        })
        .on('end', () => {
          logger.info(`Processed ${processedCount} records from CSV file`);
          resolve(opportunities);
        })
        .on('error', (error) => {
          logger.error('Error reading CSV file:', error);
          reject(error);
        });
    });
  }

  private processCsvRecord(record: any): any | null {
    try {
      // Skip records that don't have essential fields
      if (!record.NoticeId || !record.Title || !record.PostedDate) {
        return null;
      }

      // Parse the posted date
      const postedDate = this.parseDate(record.PostedDate);
      if (!postedDate) {
        return null;
      }

      // Parse the due date if available
      const dueDate = record.ResponseDeadLine ? this.parseDate(record.ResponseDeadLine) : null;

      // Parse budget/award amount
      const budget = this.parseBudget(record.Award$ || record.EstimatedValue || '0');

      // Create opportunity object
      const opportunity = {
        title: record.Title || 'Untitled Contract',
        description: record.Description || 'No description available',
        agency: record.DepartmentIndAgency || record.Department || 'Unknown Agency',
        budget: budget,
        postedDate: postedDate,
        dueDate: dueDate,
        status: this.determineStatus(record.Type, record.Active),
        sourceType: 'SAM.gov CSV',
        sourceUrl: record.Link || `https://sam.gov/opp/${record.NoticeId}/view`,
        naicsCodes: record.NaicsCode ? [record.NaicsCode] : [],
        setAside: record.SetAside || null,
        pointOfContact: this.extractContactInfo(record)
      };

      return opportunity;

    } catch (error) {
      logger.warn('Error processing CSV record:', error);
      return null;
    }
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    
    try {
      // Handle various date formats from the CSV
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  private parseBudget(value: string): number {
    if (!value) return 0;
    
    // Remove currency symbols, commas, and spaces
    const cleanValue = value.toString().replace(/[$,]/g, '').trim();
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  private determineStatus(type: string, active: string): string {
    if (active === 'No') return 'closed';
    if (type?.toLowerCase().includes('award')) return 'awarded';
    return 'new';
  }

  private extractContactInfo(record: any): any {
    const contact = {
      name: '',
      email: '',
      phone: ''
    };

    // Try primary contact first
    if (record.PrimaryContactFullname) {
      contact.name = record.PrimaryContactFullname;
      contact.email = record.PrimaryContactEmail || '';
      contact.phone = record.PrimaryContactPhone || '';
    }
    // Fall back to secondary contact
    else if (record.SecondaryContactFullname) {
      contact.name = record.SecondaryContactFullname;
      contact.email = record.SecondaryContactEmail || '';
      contact.phone = record.SecondaryContactPhone || '';
    }

    return contact.name ? contact : null;
  }

  protected async processOpportunity(rawData: any): Promise<Opportunity> {
    // This method is not used in this collector since we process data directly
    throw new Error('processOpportunity not implemented in CsvCollector');
  }
} 