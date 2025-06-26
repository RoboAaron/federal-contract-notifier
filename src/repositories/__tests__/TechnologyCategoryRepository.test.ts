import { TechnologyCategoryRepository } from '../TechnologyCategoryRepository';
import prisma from '../../config/database';

describe('TechnologyCategoryRepository', () => {
  const repo = new TechnologyCategoryRepository();
  let createdId: string;

  const testCategory = {
    name: 'Test Category',
    description: 'A test technology category',
    keywords: ['test', 'tech'],
  };

  afterAll(async () => {
    // Clean up
    await prisma.technologyCategory.deleteMany({ where: { name: 'Test Category' } });
    await prisma.$disconnect();
  });

  it('should create a technology category', async () => {
    const category = await repo.create(testCategory);
    expect(category).toBeDefined();
    expect(category.name).toBe('Test Category');
    createdId = category.id;
  });

  it('should find a technology category by ID', async () => {
    const category = await repo.findById(createdId);
    expect(category).not.toBeNull();
    expect(category?.name).toBe('Test Category');
  });

  it('should find a technology category by name', async () => {
    const category = await repo.findByName('Test Category');
    expect(category).not.toBeNull();
    expect(category?.name).toBe('Test Category');
  });

  it('should update a technology category', async () => {
    const updated = await repo.update(createdId, { name: 'Updated Category' });
    expect(updated.name).toBe('Updated Category');
  });

  it('should delete a technology category', async () => {
    await repo.delete(createdId);
    const category = await repo.findById(createdId);
    expect(category).toBeNull();
  });
}); 