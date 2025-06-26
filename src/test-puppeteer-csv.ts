import puppeteer from 'puppeteer';
import type { HTTPRequest, HTTPResponse } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

async function downloadCsvWithPuppeteer() {
  const browser = await puppeteer.launch({
    headless: false, // Set to true in production
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Go to SAM.gov login page
    console.log('Navigating to SAM.gov login...');
    await page.goto('https://sam.gov/SAM/pages/public/login.jsf', {
      waitUntil: 'networkidle0'
    });

    // Wait for user to log in manually
    console.log('Please log in to SAM.gov in the browser window...');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Navigate to Data Services page
    console.log('Navigating to Data Services page...');
    await page.goto('https://sam.gov/data-services/Contract%20Opportunities/datagov?privacy=Public', {
      waitUntil: 'networkidle0'
    });

    // Wait for the page to fully load
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Give extra time for dynamic content

    // Log all links on the page
    console.log('Scanning page for links...');
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks.map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href'),
        class: link.getAttribute('class')
      }));
    });

    console.log('Found links:', JSON.stringify(links, null, 2));

    // Try different selectors for the CSV link
    const selectors = [
      'a[href*="ContractOpportunitiesFull.csv"]',
      'a[href*=".csv"]',
      'a:contains("Contract Opportunities")',
      'a:contains("Download")',
      'a:contains("CSV")'
    ];

    let downloadUrl = null;
    for (const selector of selectors) {
      console.log(`Trying selector: ${selector}`);
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        downloadUrl = await page.evaluate((sel) => {
          const link = document.querySelector(sel);
          return link ? link.getAttribute('href') : null;
        }, selector);
        if (downloadUrl) {
          console.log(`Found download URL with selector ${selector}:`, downloadUrl);
          break;
        }
      } catch (error) {
        console.log(`Selector ${selector} not found`);
      }
    }

    if (!downloadUrl) {
      throw new Error('Could not find CSV download link');
    }

    // Create a new page for the download
    const downloadPage = await browser.newPage();
    
    // Set up download behavior
    await downloadPage.setRequestInterception(true);
    let csvData = '';

    downloadPage.on('request', (request: HTTPRequest) => {
      request.continue();
    });

    downloadPage.on('response', async (response: HTTPResponse) => {
      const url = response.url();
      if (url.includes('ContractOpportunitiesFull.csv')) {
        csvData = await response.text();
        console.log('Received CSV data');
      }
    });

    // Navigate to download URL
    console.log('Downloading CSV file...');
    await downloadPage.goto(downloadUrl, {
      waitUntil: 'networkidle0'
    });

    // Save the CSV data
    if (csvData) {
      const csvPath = path.join(__dirname, 'test-csv.csv');
      fs.writeFileSync(csvPath, csvData);
      console.log(`Saved CSV to ${csvPath}`);
    } else {
      console.log('No CSV data received');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

downloadCsvWithPuppeteer(); 