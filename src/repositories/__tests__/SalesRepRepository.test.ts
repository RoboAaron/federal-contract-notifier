import { SalesRepRepository } from '../SalesRepRepository';
import prisma from '../../config/database';

describe('SalesRepRepository', () => {
  const repo = new SalesRepRepository();
  let createdId: string;

  const testSalesRep = {
    name: 'Test Sales Rep',
    email: 'test@example.com',
    phone: '123-456-7890',
    regions: ['National'],
    minBudget: 50000,
    maxBudget: 200000,
    notificationSettings: { email: true, phone: false, frequency: 'daily' },
    isActive: true,
  };

  afterAll(async () => {
    // Clean up
    await prisma.salesRep.deleteMany({ where: { email: 'test@example.com' } });
    await prisma.$disconnect();
  });

  it('should create a sales rep', async () => {
    const rep = await repo.create(testSalesRep);
    expect(rep).toBeDefined();
    expect(rep.name).toBe('Test Sales Rep');
    createdId = rep.id;
  });

  it('should find a sales rep by ID', async () => {
    const rep = await repo.findById(createdId);
    expect(rep).not.toBeNull();
    expect(rep?.name).toBe('Test Sales Rep');
  });

  it('should find a sales rep by email', async () => {
    const rep = await repo.findByEmail('test@example.com');
    expect(rep).not.toBeNull();
    expect(rep?.name).toBe('Test Sales Rep');
  });

  it('should update a sales rep', async () => {
    const updated = await repo.update(createdId, { name: 'Updated Sales Rep' });
    expect(updated.name).toBe('Updated Sales Rep');
  });

  it('should delete a sales rep', async () => {
    await repo.delete(createdId);
    const rep = await repo.findById(createdId);
    expect(rep).toBeNull();
  });
}); 