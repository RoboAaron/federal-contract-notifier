import { setupDatabase } from './src/config/database';
import prisma from './src/config/database';

async function checkCount() {
  try {
    await setupDatabase();
    const count = await prisma.opportunity.count();
    console.log('Total opportunities in database:', count);
    
    // Also check recent opportunities
    const recent = await prisma.opportunity.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { title: true, sourceType: true, createdAt: true }
    });
    
    console.log('\nMost recent opportunities:');
    recent.forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.title} (${opp.sourceType}) - ${opp.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCount(); 