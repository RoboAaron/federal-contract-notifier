import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  size: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
  priority?: string;
  sameParty?: boolean;
}

function parseDate(dateStr: string): number | undefined {
  if (!dateStr || dateStr === 'Session') return undefined;
  try {
    return Math.floor(new Date(dateStr).getTime() / 1000);
  } catch (error) {
    console.warn(`Warning: Could not parse date "${dateStr}"`);
    return undefined;
  }
}

function parseTabularCookies(cookieData: string): Cookie[] {
  const lines = cookieData.trim().split('\n');
  const cookies: Cookie[] = [];
  
  // Skip header line if present
  const startIndex = lines[0].includes('Name') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by tabs or multiple spaces
    const parts = line.split(/\t|\s{2,}/).filter(part => part.trim());
    
    if (parts.length >= 4) {
      const cookie: Cookie = {
        name: parts[0],
        value: parts[1],
        domain: parts[2],
        path: parts[3],
        size: parseInt(parts[4]) || 0
      };
      
      // Parse optional fields if present
      if (parts[5]) cookie.expires = parseDate(parts[5]);
      if (parts[6]) cookie.httpOnly = parts[6] === '✓';
      if (parts[7]) cookie.secure = parts[7] === '✓';
      if (parts[8]) cookie.sameSite = parts[8];
      if (parts[9]) cookie.priority = parts[9];
      if (parts[10]) cookie.sameParty = parts[10] === '✓';
      
      cookies.push(cookie);
    }
  }
  
  return cookies;
}

async function exportCookies() {
  console.log('\n=== SAM.gov Cookie Export Helper ===\n');
  console.log('This helper will guide you through exporting your SAM.gov cookies.\n');
  console.log('Step 1: Log into SAM.gov');
  console.log('1. Open Chrome and go to https://sam.gov');
  console.log('2. Log in with your credentials\n');
  
  console.log('Step 2: Access the Data Services page');
  console.log('1. Navigate to: https://sam.gov/data-services/Contract%20Opportunities/datagov?privacy=Public\n');
  
  console.log('Step 3: Export cookies from Chrome DevTools');
  console.log('1. Press F12 or right-click and select "Inspect" to open DevTools');
  console.log('2. Go to the "Application" tab');
  console.log('3. In the left sidebar, under "Storage", expand "Cookies"');
  console.log('4. Click on "https://sam.gov"');
  console.log('5. Select all rows in the cookie table (Ctrl+A)');
  console.log('6. Copy the selected rows (Ctrl+C)\n');
  
  console.log('Step 4: Paste your cookies below');
  console.log('(Press Ctrl+D or Ctrl+Z when finished)\n');
  
  let cookieData = '';
  
  for await (const line of rl) {
    cookieData += line + '\n';
  }
  
  try {
    // Parse the cookie data
    const cookies = parseTabularCookies(cookieData);
    
    if (cookies.length === 0) {
      throw new Error('No valid cookies found in the pasted data');
    }
    
    console.log(`\nSuccessfully parsed ${cookies.length} cookies`);
    
    // Save cookies to file
    const outputPath = path.join(process.cwd(), 'sam-cookies.json');
    fs.writeFileSync(outputPath, JSON.stringify(cookies, null, 2));
    
    console.log('\nCookies saved successfully to:', outputPath);
    console.log('\nNext steps:');
    console.log('1. Run the CSV download test:');
    console.log('   npx ts-node src/test-cookie-csv.ts');
    
  } catch (error) {
    console.error('\nError processing cookies:', error);
    console.log('\nPlease make sure you copied the cookie table correctly from Chrome DevTools.');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the export
exportCookies().catch(console.error); 