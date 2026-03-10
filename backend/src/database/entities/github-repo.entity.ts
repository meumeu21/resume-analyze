import {
  Column, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { GithubAccount } from './github-account.entity';

@Entity('github_repos')
export class GithubRepo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'github_account_id', nullable: true })
  githubAccountId: string | null;

  @ManyToOne(() => GithubAccount, (a) => a.repos, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'github_account_id' })
  githubAccount: GithubAccount | null;

  // числовой ID репозитория на стороне GitHub
  @Column({ name: 'github_repo_id', unique: true })
  githubRepoId: number;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column()
  url: string;

  // стэк { "TypeScript": 12345, "CSS": 3210 }
  @Column({ type: 'jsonb', default: {} })
  languages: Record<string, number>;

  @Column({ type: 'text', array: true, default: [] })
  topics: string[];

  @Column({ name: 'stars_count', default: 0 })
  starsCount: number;

  @Column({ name: 'is_fork', default: false })
  isFork: boolean;

  // Первые ~500 символов README для AI анализа
  @Column({ name: 'readme_excerpt', type: 'text', nullable: true })
  readmeExcerpt: string | null;

  // package.json / requirements.txt и т.д. — сырые данные для AI
  @Column({ name: 'key_files', type: 'jsonb', default: {} })
  keyFiles: Record<string, string>;

  @Column({ name: 'cached_at', type: 'timestamptz' })
  cachedAt: Date;
}