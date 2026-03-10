import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { GithubRepo } from './github-repo.entity';
import { ProjectFile } from './project-file.entity';
import { Favorite } from './favorite.entity';

export enum ProjectSource {
  MANUAL = 'manual',
  GITHUB = 'github',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (u) => u.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // если проект из github — ссылка на репозиторий
  @Column({ name: 'github_repo_id', type: 'varchar', nullable: true })
  githubRepoId: string | null;

  @OneToOne(() => GithubRepo, { nullable: true })
  @JoinColumn({ name: 'github_repo_id' })
  githubRepo: GithubRepo | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  role: string | null;

  @Column({ type: 'text', array: true, default: [] })
  stack: string[];

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ name: 'demo_url', type: 'varchar', nullable: true })
  demoUrl: string | null;

  @Column({ name: 'repo_url', type: 'varchar', nullable: true })
  repoUrl: string | null;

  @Column({
    type: 'enum',
    enum: ProjectSource,
    default: ProjectSource.MANUAL,
  })
  source: ProjectSource;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'started_at', type: 'date', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'date', nullable: true })
  finishedAt: Date | null;

  @OneToMany(() => ProjectFile, (f) => f.project, { cascade: true })
  files: ProjectFile[];

  @OneToMany(() => Favorite, (f) => f.project)
  favoritedBy: Favorite[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}