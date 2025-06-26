# SAM.gov CSV Access Guide

## Overview
This guide explains how to programmatically access the daily `ContractOpportunitiesFull.csv` file from SAM.gov using browser cookies for authentication.

## Prerequisites
1. A SAM.gov account with access to the Data Services page
2. Chrome/Chromium browser
3. Node.js and npm installed
4. Required npm packages:
   - puppeteer
   - @types/puppeteer

## Step 1: Export Browser Cookies
You have two options to export your cookies:

### Option A: Using the Cookie Export Helper (Recommended)
1. Run the cookie export helper:
   ```bash
   npx ts-node src/export-cookies.ts
   ```
2. Follow the on-screen instructions to:
   - Log into SAM.gov in Chrome
   - Open DevTools
   - Copy cookies
   - Paste them into the helper
3. The helper will validate and save your cookies to `sam-cookies.json`

### Option B: Manual Export
1. Log into SAM.gov in your Chrome browser
2. Navigate to the Data Services page: https://sam.gov/data-services/Contract%20Opportunities/datagov?privacy=Public
3. Open Chrome DevTools (F12 or right-click -> Inspect)
4. Go to the "Application" tab
5. In the left sidebar, under "Storage", expand "Cookies"
6. Click on "https://sam.gov"
7. Right-click on the cookies table and select "Copy all"
8. Save the cookies to a file named `sam-cookies.json`

## Step 2: Cookie Format
The exported cookies should be in this format:
```json
[
  {
    "domain": "sam.gov",
    "name": "cookie_name",
    "value": "cookie_value",
    "path": "/",
    "secure": true,
    "httpOnly": true
  }
]
```

## Step 3: Download the CSV File
1. Run the CSV download script:
   ```bash
   npx ts-node src/test-cookie-csv.ts
   ```
2. The script will:
   - Load your cookies
   - Navigate to the Data Services page
   - Find and download the latest CSV file
   - Save it as `test-csv.csv`

## Security Considerations
1. Never commit cookie files to version control
2. Store cookies in a secure location
3. Rotate cookies regularly
4. Use environment variables for sensitive data

## Troubleshooting
1. If cookies expire, repeat Step 1
2. If download fails, check:
   - Cookie validity
   - Network connectivity
   - SAM.gov service status
3. For rate limiting issues:
   - Implement delays between requests
   - Use exponential backoff
   - Monitor SAM.gov terms of service

## References
- [SAM.gov Data Services](https://sam.gov/data-services/Contract%20Opportunities/datagov?privacy=Public)
- [Puppeteer Documentation](https://pptr.dev/)
- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/) 