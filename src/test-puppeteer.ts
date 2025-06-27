import puppeteer from 'puppeteer';
import { createLogger } from './utils/logger';

const logger = createLogger('test-puppeteer');

async function testPuppeteer() {
  let browser;
  try {
    logger.info('Testing Puppeteer...');
    
    // Test 1: Launch browser in non-headless mode to see the window
    logger.info('Launching browser in non-headless mode...');
    browser = await puppeteer.launch({
      headless: false, // This will show the browser window
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Test 2: Navigate to a simple website first
    logger.info('Navigating to Google to test basic functionality...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Wait a moment to see the page
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Try to navigate to SAM.gov
    logger.info('Navigating to SAM.gov...');
    await page.goto('https://sam.gov/data-services/Contract%20Opportunities/datagov?privacy=Public', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 4: Take a screenshot
    await page.screenshot({ path: 'logs/puppeteer-test-screenshot.png', fullPage: true });
    logger.info('Screenshot saved to logs/puppeteer-test-screenshot.png');
    
    // Test 5: Get page title
    const title = await page.title();
    logger.info(`Page title: ${title}`);
    
    // Test 6: Look for any links on the page
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks.slice(0, 10).map(link => ({
        text: link.textContent?.trim() || '',
        href: link.getAttribute('href') || ''
      }));
    });
    
    logger.info('First 10 links found:');
    links.forEach((link, index) => {
      logger.info(`${index + 1}. ${link.text} -> ${link.href}`);
    });
    
    logger.info('Puppeteer test completed successfully!');
    
  } catch (error) {
    logger.error('Puppeteer test failed:', error);
  } finally {
    if (browser) {
      logger.info('Closing browser...');
      await browser.close();
    }
  }
}

testPuppeteer().catch(console.error); 