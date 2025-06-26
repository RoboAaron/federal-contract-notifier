import puppeteer from 'puppeteer';
import type { CookieParam } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  size: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  priority?: string;
  sameParty?: boolean;
}

function getValidExpiration(expires: number | null | undefined): number | undefined {
  if (expires === null || expires === undefined) {
    // Set session cookies to expire in 1 hour
    return Math.floor(Date.now() / 1000) + 3600;
  }
  
  // Check if the expiration is within a reasonable range
  const now = Math.floor(Date.now() / 1000);
  if (expires > now - 86400 && expires < now + 31536000) {
    return expires;
  }
  
  // If expiration is invalid, set to 1 hour from now
  return now + 3600;
}

function normalizeSameSite(sameSite: string | undefined): 'Strict' | 'Lax' | 'None' | undefined {
  if (!sameSite) return undefined;
  const normalized = sameSite.toLowerCase();
  if (normalized === 'strict' || normalized === 'lax' || normalized === 'none') {
    return normalized as 'Strict' | 'Lax' | 'None';
  }
  return 'Lax'; // Default to Lax if invalid value
}

async function downloadCsvWithCookies() {
  console.log('Starting CSV download test...');
  
  // Check if cookie file exists
  const cookiePath = path.join(process.cwd(), 'sam-cookies.json');
  if (!fs.existsSync(cookiePath)) {
    console.error('Error: sam-cookies.json not found. Please run export-cookies.ts first.');
    process.exit(1);
  }

  // Load cookies
  console.log('Loading cookies from sam-cookies.json...');
  const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8')) as Cookie[];
  console.log(`Loaded ${cookies.length} cookies`);

  // Validate and clean cookies
  const validCookies = cookies
    .map(cookie => {
      // Ensure domain starts with a dot for SAM.gov cookies
      const domain = cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`;
      
      // Convert expires to number if it's a string
      let expires = cookie.expires;
      if (typeof expires === 'string') {
        try {
          expires = Math.floor(new Date(expires).getTime() / 1000);
        } catch (error) {
          console.warn(`Warning: Could not parse expiration date for cookie ${cookie.name}`);
          expires = undefined;
        }
      }

      // Convert to Puppeteer's CookieParam type
      const validCookie: CookieParam = {
        name: cookie.name,
        value: cookie.value,
        domain,
        path: cookie.path,
        expires: getValidExpiration(expires),
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: normalizeSameSite(cookie.sameSite)
      };

      return validCookie;
    })
    .filter(cookie => {
      // Filter out cookies with invalid domains or missing required fields
      if (!cookie.domain || !cookie.name || !cookie.value) {
        console.warn(`Warning: Skipping invalid cookie: ${cookie.name}`);
        return false;
      }
      return true;
    });

  console.log('Validated cookies:', JSON.stringify(validCookies, null, 2));

  // Launch browser with download preferences
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false, // Set to true in production
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    // Set up download handling
    const downloadPath = path.join(process.cwd(), 'test-csv.csv');
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: process.cwd()
    });
    
    // Set cookies
    console.log('Setting cookies...');
    await page.setCookie(...validCookies);
    
    // Navigate to Data Services page
    console.log('Navigating to SAM.gov Data Services page...');
    await page.goto('https://sam.gov/data-services/Contract%20Opportunities/datagov?privacy=Public', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for content to load
    console.log('Waiting for page content to load...');
    await page.waitForSelector('body', { timeout: 10000 });

    // Wait for the CSV download link to be available
    console.log('Waiting for CSV download link...');
    await page.waitForSelector('a[href*="ContractOpportunitiesFullCSV.csv"]', { timeout: 10000 });

    // Click the download link
    console.log('Clicking download link...');
    await Promise.all([
      page.waitForResponse(response => response.url().includes('ContractOpportunitiesFullCSV.csv')),
      page.click('a[href*="ContractOpportunitiesFullCSV.csv"]')
    ]);

    // Wait for the download to complete
    console.log('Waiting for download to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Give some time for the download

    // Verify the downloaded file
    if (!fs.existsSync(downloadPath)) {
      throw new Error('CSV file was not downloaded');
    }

    const stats = fs.statSync(downloadPath);
    console.log(`File size: ${stats.size} bytes`);
    if (stats.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    console.log('CSV download test completed successfully!');

  } catch (error) {
    console.error('Error during CSV download:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
downloadCsvWithCookies().catch(console.error); 