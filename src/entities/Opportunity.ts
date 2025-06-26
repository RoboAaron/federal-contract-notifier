import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { TechnologyCategory } from './TechnologyCategory';
import { SalesRep } from './SalesRep';

@Entity()
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column()
  agency!: string;

  @Column()
  department!: string;

  @Column('decimal', { nullable: true })
  budget!: number;

  @Column()
  publishDate!: Date;

  @Column({ nullable: true })
  dueDate!: Date;

  @Column({
    type: 'enum',
    enum: ['new', 'updated', 'closed'],
    default: 'new'
  })
  status!: 'new' | 'updated' | 'closed';

  @Column('jsonb', { nullable: true })
  pointOfContact!: {
    name: string;
    email: string;
    phone: string;
  };

  @Column()
  sourceUrl!: string;

  @Column()
  sourceType!: string;

  @Column('jsonb', { nullable: true })
  rawData!: any;

  @ManyToMany(() => TechnologyCategory)
  @JoinTable()
  technologyTypes!: TechnologyCategory[];

  @ManyToMany(() => SalesRep)
  @JoinTable()
  notifiedSalesReps!: SalesRep[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor() {
    this.technologyTypes = [];
    this.notifiedSalesReps = [];
  }
} 