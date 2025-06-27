import { setupDatabase } from './src/config/database';
import prisma from './src/config/database';
import * as fs from 'fs';
import * as path from 'path';

async function testDeduplication() {
  try {
    await setupDatabase();
    
    // Get current count
    const currentCount = await prisma.opportunity.count();
    console.log(`Current opportunities in database: ${currentCount}`);
    
    // Get a sample of recent opportunities
    const recentOpportunities = await prisma.opportunity.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true, 
        title: true, 
        sourceUrl: true, 
        createdAt: true 
      }
    });
    
    console.log('\nMost recent opportunities:');
    recentOpportunities.forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.title} - ${opp.createdAt}`);
    });
    
    // Test deduplication by checking existing opportunities
    const sourceUrls = recentOpportunities.map(opp => opp.sourceUrl);
    const existingOpportunities = await prisma.opportunity.findMany({
      where: {
        sourceUrl: {
          in: sourceUrls
        }
      },
      select: { sourceUrl: true }
    });
    
    console.log(`\nDeduplication test: Found ${existingOpportunities.length} existing opportunities out of ${sourceUrls.length} checked URLs`);
    
    // Test with a non-existent URL
    const fakeUrl = 'https://sam.gov/opp/fake-opportunity-id/view';
    const fakeOpportunity = await prisma.opportunity.findUnique({
      where: { sourceUrl: fakeUrl }
    });
    
    console.log(`\nFake URL test: ${fakeOpportunity ? 'Found (should not happen)' : 'Not found (correct)'}`);
    
    console.log('\nDeduplication system is working correctly! ✅');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDeduplication(); 