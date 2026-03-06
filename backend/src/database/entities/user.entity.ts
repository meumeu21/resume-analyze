import {
  Column, CreateDateColumn, Entity,
  OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { Project } from './project.entity';
import { GithubAccount } from './github-account.entity';
import { AiReport } from './ai-report.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { ProfileView } from './profile-view.entity';
import { ContactLink } from './contact-link.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Profile, (p) => p.user, { cascade: true })
  profile: Profile;

  @OneToMany(() => ContactLink, (l) => l.user, { cascade: true })
  contactLinks: ContactLink[];

  @OneToMany(() => Project, (p) => p.user, { cascade: true })
  projects: Project[];

  @OneToOne(() => GithubAccount, (a) => a.user, { cascade: true })
  githubAccount: GithubAccount;

  @OneToMany(() => AiReport, (r) => r.user)
  aiReports: AiReport[];

  @OneToMany(() => PasswordResetToken, (t) => t.user)
  passwordResetTokens: PasswordResetToken[];

  @OneToMany(() => ProfileView, (v) => v.profileOwner)
  profileViews: ProfileView[];
}