import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

async function inspectPageStructure() {
  try {
    console.log('Fetching Data Services page...');
    const response = await axios.get('https://sam.gov/data-services/Contract%20Opportunities/datagov?privacy=Public', {
      headers: {
        'User-Agent': 'FederalContractNotifier/1.0'
      }
    });

    // Save the HTML for inspection
    const htmlPath = path.join(__dirname, 'page-structure.html');
    fs.writeFileSync(htmlPath, response.data);
    console.log(`Saved HTML to ${htmlPath}`);

    // Parse with cheerio
    const $ = cheerio.load(response.data);
    
    // Log all links
    console.log('\nAll links found:');
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      console.log(`${i + 1}. Text: "${text}"`);
      console.log(`   Href: ${href}`);
    });

    // Look specifically for CSV links
    console.log('\nCSV links found:');
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.toLowerCase().includes('.csv')) {
        const text = $(el).text().trim();
        console.log(`${i + 1}. Text: "${text}"`);
        console.log(`   Href: ${href}`);
      }
    });

    // Look for table structures
    console.log('\nTable structures found:');
    $('table').each((i, table) => {
      console.log(`\nTable ${i + 1}:`);
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('td, th').map((k, cell) => $(cell).text().trim()).get();
        console.log(`Row ${j + 1}: ${cells.join(' | ')}`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

inspectPageStructure(); 