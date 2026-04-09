import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

export enum ReportType {
  ACTIVITY_FIELD = 'activity_field',   // сфера деятельности на основе проектов и стека
  IMPROVEMENTS = 'improvements',       // что можно улучшить / какие технологии изучить
  PROJECT_SUMMARY = 'project_summary', // резюме конкретного проекта
}

export enum ReportStatus {
  PENDING = 'pending',
  DONE = 'done',
  ERROR = 'error',
}

@Entity('ai_reports')
export class AiReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (u) => u.aiReports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // NULL = портфолио в целом, указан = конкретный проект
  @Column({ name: 'project_id', type: 'varchar', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({ name: 'report_type', type: 'enum', enum: ReportType })
  reportType: ReportType;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  recommendations: string | null;

  // полный ответ от AI
  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse: Record<string, unknown> | null;

  // виден ли отчёт другим пользователям на профиле
  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'error_message', type: 'varchar', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}