import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { Opportunity } from './Opportunity';
import { TechnologyCategory } from './TechnologyCategory';

@Entity()
export class SalesRep {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column('simple-array', { nullable: true })
  regions!: string[];

  @Column('decimal', { nullable: true })
  minBudget!: number;

  @Column('decimal', { nullable: true })
  maxBudget!: number;

  @ManyToMany(() => TechnologyCategory)
  technologyInterests!: TechnologyCategory[];

  @Column('boolean', { default: true })
  isActive!: boolean;

  @Column('jsonb', { default: {} })
  notificationSettings!: {
    email: boolean;
    phone: boolean;
    frequency: 'daily' | 'weekly';
  };

  @ManyToMany(() => Opportunity)
  notifiedOpportunities!: Opportunity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor() {
    this.technologyInterests = [];
    this.regions = [];
    this.notificationSettings = {
      email: true,
      phone: false,
      frequency: 'daily'
    };
    this.notifiedOpportunities = [];
  }
} 