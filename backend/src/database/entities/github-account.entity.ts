import {
  Column, CreateDateColumn, Entity,
  JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { GithubRepo } from './github-repo.entity';

@Entity('github_accounts')
export class GithubAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @OneToOne(() => User, (u) => u.githubAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'github_username', unique: true })
  githubUsername: string;

  // когда последний раз синхронизировали репозитории
  @Column({ name: 'cached_at', type: 'timestamptz', nullable: true })
  cachedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => GithubRepo, (repo) => repo.githubAccount, { cascade: true })
  repos: GithubRepo[];
}