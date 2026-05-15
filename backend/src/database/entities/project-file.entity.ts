import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';

export enum ProjectFileType {
  IMAGE = 'image',
  FILE = 'file',
}

@Entity('project_files')
export class ProjectFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, (p) => p.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ type: 'enum', enum: ProjectFileType })
  type: ProjectFileType;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
