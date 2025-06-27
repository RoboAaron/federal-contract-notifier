import puppeteer, { Page, HTTPResponse, ElementHandle } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { authenticator } from 'otplib';

// Load environment variables
dotenv.config();

interface LoginCredentials {
  username: string;
  password: string;
}

async function getLoginCredentials(): Promise<LoginCredentials> {
  const username = process.env.SAM_GOV_USERNAME;
  const password = process.env.SAM_GOV_PASSWORD;

  if (!username || !password) {
    throw new Error('SAM.gov credentials not found in environment variables. Please set SAM_GOV_USERNAME and SAM_GOV_PASSWORD.');
  }

  return { username, password };
}

// Helper to race multiple selectors and resolve on the first found
async function waitForAnySelector(page: Page, selectors: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timers: NodeJS.Timeout[] = [];
    selectors.forEach(selector => {
      page.waitForSelector(selector, { timeout })
        .then(() => {
          if (!settled) {
            settled = true;
            timers.forEach(clearTimeout);
            resolve(selector);
          }
        })
        .catch(() => {});
    });
    // Global timeout
    const globalTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('No selector found in time'));
      }
    }, timeout);
    timers.push(globalTimer);
  });
}

async function handleLoginGov(page: Page, credentials: LoginCredentials): Promise<void> {
  console.log('Waiting for login.gov page...');
  
  // Wait for login.gov page to load
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  
  // Enter email
  console.log('Entering email...');
  await page.type('input[type="email"]', credentials.username);
  
  // Click continue and wait for password field
  console.log('Clicking continue...');
  await Promise.all([
    page.waitForSelector('input[type="password"]', { timeout: 30000 }),
    page.click('button[type="submit"]')
  ]);

  // Enter password
  console.log('Entering password...');
  await page.type('input[type="password"]', credentials.password);
  
  // Click continue and wait for either 2FA or navigation
  console.log('Clicking continue...');
  await page.click('button[type="submit"]');

  const twoFASelectors = [
    'input[type="tel"]',
    'input[type="text"]',
    'input[name*="code"]',
    'input[name*="otp"]',
    'input[name*="token"]',
    'input[name*="passcode"]',
    'input'
  ];
  const samGovUrlCheck = async () => page.url().includes('sam.gov');
  let twoFAOrRedirect: string | null = null;
  let navigationHappened = false;
  try {
    console.log('Waiting for 2FA prompt or navigation...');
    twoFAOrRedirect = await Promise.race([
      waitForAnySelector(page, twoFASelectors, 120000).then(() => '2fa'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }).then(() => 'navigated')
    ]);
  } catch (e) {
    await page.screenshot({ path: 'after-password-submit.png', fullPage: true });
    const html = await page.content();
    require('fs').writeFileSync('after-password-submit.html', html);
    throw new Error('Neither 2FA prompt nor navigation occurred after password submit. See after-password-submit.png and after-password-submit.html for debugging.');
  }

  if (twoFAOrRedirect === '2fa') {
    // Handle 2FA
    console.log('2FA prompt detected!');
    // Wait for the 2FA prompt to fully load
    await new Promise(res => setTimeout(res, 2000));
    // Print all input fields and their attributes
    const inputFields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map(input => ({
        name: input.name,
        id: input.id,
        type: input.type,
        placeholder: input.placeholder,
        outerHTML: input.outerHTML
      }));
    });
    console.log('Input fields on 2FA page:', JSON.stringify(inputFields, null, 2));
    const screenshotPath = path.join(process.cwd(), '2fa-prompt.png') as `${string}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`2FA prompt screenshot saved to ${screenshotPath}`);

    // Automated TOTP entry
    const totpSecret = process.env.TOTP_SECRET;
    if (!totpSecret) {
      throw new Error('TOTP_SECRET not set in environment.');
    }
    const code = authenticator.generate(totpSecret);
    console.log('Generated TOTP code:', code);
    // Find the OTP input and enter the code
    await page.type('input[id^="code-"]', code, { delay: 50 });
    // Submit the form (adjust selector if needed)
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
      page.click('button[type="submit"], button[name="submit"]')
    ]);
    // Wait for navigation to complete
    const currentUrl = page.url();
    console.log('2FA completed, now on:', currentUrl);
    return;
  } else if (twoFAOrRedirect === 'navigated') {
    navigationHappened = true;
    // After navigation, check the new URL and look for 2FA or sam.gov
    const newUrl = page.url();
    console.log(`Navigation occurred. New URL: ${newUrl}`);
    if (newUrl.includes('sam.gov')) {
      console.log('Redirected to sam.gov!');
      return;
    }
    if (newUrl.includes('login.gov') && newUrl.includes('/two_factor/')) {
      // Prompt user to complete 2FA in browser
      console.log('\n=== 2FA REQUIRED (after navigation) ===');
      console.log('Please complete the 2FA process in the browser window.');
      console.log('Waiting for redirect to sam.gov...');
      let currentUrl = page.url();
      if (!currentUrl.includes('sam.gov')) {
        await page.waitForFunction(() => window.location.href.includes('sam.gov'), { timeout: 120000 });
        currentUrl = page.url();
      }
      console.log('2FA completed, now on:', currentUrl);
      console.log('2FA completed successfully!');
    } else if (newUrl.includes('login.gov')) {
      // Try to find the 2FA prompt again
      try {
        await waitForAnySelector(page, twoFASelectors, 60000);
        const screenshotPath = path.join(process.cwd(), '2fa-prompt-after-nav.png') as `${string}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`2FA prompt screenshot saved to ${screenshotPath}`);
        console.log('\n=== 2FA REQUIRED (after navigation) ===');
        console.log('Please enter the 2FA code in the browser window.');
        console.log('Waiting for 2FA completion...');
        let currentUrl = page.url();
        if (!currentUrl.includes('sam.gov')) {
          await page.waitForFunction(() => window.location.href.includes('sam.gov'), { timeout: 120000 });
          currentUrl = page.url();
        }
        console.log('2FA completed, now on:', currentUrl);
        console.log('2FA completed successfully!');
      } catch (e) {
        await page.screenshot({ path: 'after-nav-no-2fa.png', fullPage: true });
        const html = await page.content();
        require('fs').writeFileSync('after-nav-no-2fa.html', html);
        throw new Error('Navigation occurred but 2FA prompt not found. See after-nav-no-2fa.png and after-nav-no-2fa.html for debugging.');
      }
    } else {
      await page.screenshot({ path: 'after-nav-unknown.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('after-nav-unknown.html', html);
      throw new Error(`Navigation occurred to unknown URL: ${newUrl}. See after-nav-unknown.png and after-nav-unknown.html for debugging.`);
    }
  }
}

async function loginToSamGov(page: Page, credentials: LoginCredentials): Promise<void> {
  console.log('Navigating to SAM.gov home page...');
  await page.goto('https://sam.gov/', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Take screenshot of initial page
  const initialScreenshotPath = path.join(process.cwd(), 'initial-page.png') as `${string}.png`;
  await page.screenshot({ path: initialScreenshotPath, fullPage: true });
  console.log(`Initial page screenshot saved to ${initialScreenshotPath}`);

  // Click the Sign In link in the top right
  console.log('Looking for Sign In link...');
  const signInLinkHandle = await page.evaluateHandle(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.find(link => link.textContent && link.textContent.trim() === 'Sign In') || null;
  });
  if (!signInLinkHandle) {
    const allLinks = await page.$$eval('a', links => links.map(l => l.outerHTML));
    require('fs').writeFileSync('all-links-debug.txt', allLinks.join('\n---\n'));
    await page.screenshot({ path: 'sign-in-not-found.png', fullPage: true });
    throw new Error('Sign In link not found. See sign-in-not-found.png and all-links-debug.txt for troubleshooting.');
  }
  const signInElement = signInLinkHandle.asElement() as ElementHandle<Element> | null;
  if (!signInElement) {
    throw new Error('Sign In link handle is not an element.');
  }
  console.log('Clicking Sign In link...');
  await signInElement.click();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Wait for the modal dialog and click Agree
  console.log('Waiting for Agree button in modal...');
  const agreeButtonHandle = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => btn.textContent && btn.textContent.trim() === 'Agree') || null;
  });
  if (!agreeButtonHandle) {
    const allButtons = await page.$$eval('button', btns => btns.map(b => b.outerHTML));
    require('fs').writeFileSync('all-buttons-debug.txt', allButtons.join('\n---\n'));
    await page.screenshot({ path: 'agree-not-found.png', fullPage: true });
    throw new Error('Agree button not found. See agree-not-found.png and all-buttons-debug.txt for troubleshooting.');
  }
  const agreeElement = agreeButtonHandle.asElement() as ElementHandle<Element> | null;
  if (!agreeElement) {
    throw new Error('Agree button handle is not an element.');
  }
  console.log('Clicking Agree button...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
    agreeElement.click()
  ]);

  // Now on login.gov, handle login.gov authentication
  await handleLoginGov(page, credentials);

  // Wait for navigation to complete after login
  console.log('Waiting for post-login navigation to complete...');
  await new Promise(res => setTimeout(res, 5000)); // Wait 5 seconds for any redirects

  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
  await page.screenshot({ path: 'post-login-debug.png', fullPage: true });

  // Only navigate to the home page if not already there
  if (!currentUrl.startsWith('https://sam.gov/')) {
    console.log('Navigating to SAM.gov home page...');
    await page.goto('https://sam.gov/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('Arrived at SAM.gov home page.');
  } else {
    console.log('Already on SAM.gov home page or a subpage.');
  }

  // Verify we're back on SAM.gov
  const currentUrlAfterLogin = page.url();
  if (!currentUrlAfterLogin.includes('sam.gov')) {
    throw new Error('Login failed - not redirected back to SAM.gov');
  }

  console.log('Login successful!');
}

async function downloadCsvFile(page: Page): Promise<void> {
  // Create a dedicated downloads directory
  const downloadDir = path.join(process.cwd(), 'downloads');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
  }
  console.log('Download directory:', downloadDir);

  console.log('Navigating to SAM.gov home page...');
  await page.goto('https://sam.gov/', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait for content to load
  console.log('Waiting for page content to load...');
  await page.waitForSelector('body', { timeout: 10000 });

  // Find and click the Data Services link
  console.log('Looking for Data Services link...');
  const dataServicesLinkHandle = await page.evaluateHandle(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.find(link => link.textContent && link.textContent.trim() === 'Data Services') || null;
  });
  
  if (!dataServicesLinkHandle) {
    await page.screenshot({ path: 'data-services-link-not-found.png', fullPage: true });
    throw new Error('Data Services link not found on SAM.gov home page');
  }
  
  const dataServicesElement = dataServicesLinkHandle.asElement() as ElementHandle<Element> | null;
  if (!dataServicesElement) {
    throw new Error('Data Services link handle is not an element');
  }

  console.log('Clicking Data Services link...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
    dataServicesElement.click()
  ]);

  // Now look for Contract Opportunities link
  console.log('Looking for Contract Opportunities link...');
  const contractOppsLinkHandle = await page.evaluateHandle(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.find(link => link.textContent && link.textContent.includes('Contract Opportunities')) || null;
  });
  
  if (!contractOppsLinkHandle) {
    await page.screenshot({ path: 'contract-opps-link-not-found.png', fullPage: true });
    throw new Error('Contract Opportunities link not found on Data Services page');
  }
  
  const contractOppsElement = contractOppsLinkHandle.asElement() as ElementHandle<Element> | null;
  if (!contractOppsElement) {
    throw new Error('Contract Opportunities link handle is not an element');
  }

  console.log('Clicking Contract Opportunities link...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
    contractOppsElement.click()
  ]);

  // Take screenshot for debugging
  const screenshotPath = path.join(process.cwd(), 'debug-screenshot.png') as `${string}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Debug screenshot saved to ${screenshotPath}`);

  // First, click on the "datagov" link to navigate into that folder
  console.log('Looking for datagov folder link...');
  const datagovLinkHandle = await page.evaluateHandle(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.find(link => {
      const text = link.textContent || '';
      const cleanText = text.replace(/\s+/g, ' ').trim();
      return cleanText.includes('datagov') && link.classList.contains('data-service-file-link');
    }) || null;
  });
  
  if (!datagovLinkHandle) {
    // Fallback: try to find by class name
    console.log('Trying fallback search by class name for datagov...');
    const datagovElement = await page.$('a.data-service-file-link');
    if (!datagovElement) {
      await page.screenshot({ path: 'datagov-link-not-found.png', fullPage: true });
      throw new Error('Datagov folder link not found on Contract Opportunities page');
    }
    console.log('Found datagov link by class name');
    
    console.log('Clicking datagov folder link...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      datagovElement.click()
    ]);
  } else {
    const datagovElement = datagovLinkHandle.asElement() as ElementHandle<Element> | null;
    if (!datagovElement) {
      throw new Error('Datagov folder link handle is not an element');
    }

    console.log('Clicking datagov folder link...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      datagovElement.click()
    ]);
  }

  // Wait for the page to load after clicking datagov
  await new Promise(res => setTimeout(res, 3000));
  
  // Take another screenshot after navigating to datagov folder
  const datagovScreenshotPath = path.join(process.cwd(), 'datagov-folder-screenshot.png') as `${string}.png`;
  await page.screenshot({ path: datagovScreenshotPath, fullPage: true });
  console.log(`Datagov folder screenshot saved to ${datagovScreenshotPath}`);

  // Now look for the CSV download link in the datagov folder
  console.log('Looking for CSV download link in datagov folder...');
  const csvLinkHandle = await page.evaluateHandle(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.find(link => {
      const text = link.textContent || '';
      const cleanText = text.replace(/\s+/g, ' ').trim();
      return cleanText.includes('ContractOpportunitiesFullCSV.csv');
    }) || null;
  });
  const csvElement = csvLinkHandle.asElement() as ElementHandle<Element> | null;
  if (!csvElement) {
    const allLinks = await page.$$eval('a', links => links.map(l => l.outerHTML));
    require('fs').writeFileSync('all-csv-links-debug.txt', allLinks.join('\n---\n'));
    await page.screenshot({ path: 'csv-link-not-found.png', fullPage: true });
    throw new Error('CSV download link not found or not an element. See csv-link-not-found.png and all-csv-links-debug.txt for troubleshooting.');
  }

  // Set up download handling
  const expectedFileName = 'ContractOpportunitiesFullCSV.csv';
  const downloadFilePath = path.join(downloadDir, expectedFileName);
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  // Get list of files before download
  const filesBefore = new Set(fs.readdirSync(downloadDir));
  const csvFilesBefore = Array.from(filesBefore).filter(f => f.endsWith('.csv'));
  console.log('CSV files before download:', csvFilesBefore);

  // Click the CSV link to trigger the JavaScript download
  await csvElement.click();

  // Wait for the new file to appear and finish downloading
  console.log('Waiting for CSV file to appear in download directory and finish downloading...');
  const timeout = 600000; // 10 minutes
  const pollInterval = 1000; // 1 second
  let waited = 0;
  let found = false;
  let lastSize = 0;
  let stableCount = 0;
  const stableThreshold = 5; // seconds of unchanged size to consider download complete
  let chosenCsvFile = '';
  while (waited < timeout) {
    const filesNow = new Set(fs.readdirSync(downloadDir));
    let tempFileExists = false;
    // Find all new .csv files
    const newCsvFiles = Array.from(filesNow).filter(f => f.endsWith('.csv') && !filesBefore.has(f));
    // Log all .csv files and their sizes
    const csvFileSizes = newCsvFiles.map(f => {
      const size = fs.statSync(path.join(downloadDir, f)).size;
      return { name: f, size };
    });
    console.log('Detected .csv files:', csvFileSizes);
    // Pick the largest new .csv file (most likely the download)
    if (csvFileSizes.length > 0) {
      csvFileSizes.sort((a, b) => b.size - a.size);
      chosenCsvFile = csvFileSizes[0].name;
      const chosenPath = path.join(downloadDir, chosenCsvFile);
      const stats = fs.statSync(chosenPath);
      if (stats.size === lastSize && stats.size > 0) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      lastSize = stats.size;
      // Check for temp download files
      for (const file of filesNow) {
        if (file.endsWith('.crdownload') || file.endsWith('.part') || file.endsWith('.tmp')) {
          tempFileExists = true;
        }
      }
      // Only proceed if .csv file exists, is stable, and no temp file exists
      if (stableCount >= stableThreshold && !tempFileExists) {
        // Move/rename the file to the expected name if needed
        if (chosenCsvFile !== expectedFileName) {
          fs.renameSync(chosenPath, downloadFilePath);
        }
        found = true;
        break;
      }
    }
    await new Promise(res => setTimeout(res, pollInterval));
    waited += pollInterval;
  }
  if (!found) {
    throw new Error('CSV file was not downloaded within the timeout period.');
  }
  console.log(`CSV file downloaded to ${downloadFilePath}`);

  // List files after download
  const filesAfter = fs.readdirSync(downloadDir);
  console.log('Files in download directory after download:', filesAfter);

  // Verify the downloaded file
  if (!fs.existsSync(downloadFilePath)) {
    throw new Error('CSV file was not downloaded');
  }

  const stats = fs.statSync(downloadFilePath);
  console.log(`File size: ${stats.size} bytes`);
  if (stats.size === 0) {
    throw new Error('Downloaded file is empty');
  }

  console.log('CSV download completed successfully!');
}

async function main() {
  console.log('Starting SAM.gov automation...');

  // Get login credentials
  const credentials = await getLoginCredentials();

  // Launch browser
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false, // Set to true in production
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    // Set up download handling
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: process.cwd()
    });

    // Login to SAM.gov
    await loginToSamGov(page, credentials);

    // Download CSV file
    await downloadCsvFile(page);

  } catch (error) {
    console.error('Error during automation:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the automation
main().catch(console.error); 