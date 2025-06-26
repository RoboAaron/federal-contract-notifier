import { OpportunityRepository } from '../OpportunityRepository';
import prisma from '../../config/database';

describe('OpportunityRepository', () => {
  const repo = new OpportunityRepository();
  let createdId: string;

  const testOpportunity = {
    title: 'Test Opportunity',
    description: 'A test opportunity',
    agency: 'Test Agency',
    budget: 100000,
    sourceUrl: 'https://example.com/opportunity/1',
    sourceType: 'TestSource',
    postedDate: new Date(),
    dueDate: new Date(Date.now() + 86400000),
    status: 'Open',
    naicsCodes: ['541512'],
    setAside: 'None',
    pointOfContact: { name: 'John Doe', email: 'john@example.com' },
    technologyCategories: { create: [{ name: 'Cloud', description: 'Cloud Tech', keywords: ['cloud'] }] },
  };

  afterAll(async () => {
    // Clean up
    await prisma.opportunity.deleteMany({ where: { sourceUrl: 'https://example.com/opportunity/1' } });
    await prisma.technologyCategory.deleteMany({ where: { name: 'Cloud' } });
    await prisma.$disconnect();
  });

  it('should create an opportunity', async () => {
    const opp = await repo.create(testOpportunity);
    expect(opp).toBeDefined();
    expect(opp.title).toBe('Test Opportunity');
    createdId = opp.id;
  });

  it('should find an opportunity by sourceUrl', async () => {
    const opp = await repo.findBySourceUrl('https://example.com/opportunity/1');
    expect(opp).not.toBeNull();
    expect(opp?.title).toBe('Test Opportunity');
  });

  it('should find recent opportunities', async () => {
    const recent = await repo.findRecent(5);
    expect(Array.isArray(recent)).toBe(true);
    expect(recent.length).toBeGreaterThan(0);
  });

  it('should delete old opportunities', async () => {
    // Set retention to 0 months to delete all
    const deleted = await repo.deleteOldOpportunities(0);
    expect(typeof deleted).toBe('number');
  });
}); 