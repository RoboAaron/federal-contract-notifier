import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function testDirectCsvAccess() {
  try {
    // Try different potential URLs
    const urls = [
      'https://sam.gov/data-services/Contract%20Opportunities/datagov?privacy=Public',
      'https://sam.gov/data-services/Contract%20Opportunities/ContractOpportunitiesFull.csv',
      'https://sam.gov/data-services/Contract%20Opportunities/ContractOpportunitiesFull',
      'https://sam.gov/data-services/Contract%20Opportunities/ContractOpportunitiesFull.csv?privacy=Public'
    ];

    for (const url of urls) {
      console.log(`\nTrying URL: ${url}`);
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'FederalContractNotifier/1.0',
            'Accept': 'text/csv,application/csv'
          },
          responseType: 'text'
        });

        // Check if response looks like CSV
        const isCsv = response.data.includes('noticeId') && response.data.includes('csv');
        console.log(`Response type: ${response.headers['content-type']}`);
        console.log(`Looks like CSV: ${isCsv}`);
        console.log(`First 200 chars: ${response.data.substring(0, 200)}`);

        if (isCsv) {
          // Save the CSV for inspection
          const csvPath = path.join(__dirname, 'test-csv.csv');
          fs.writeFileSync(csvPath, response.data);
          console.log(`Saved CSV to ${csvPath}`);
          break;
        }
      } catch (error: any) {
        console.log(`Error with ${url}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testDirectCsvAccess(); 