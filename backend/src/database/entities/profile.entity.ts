import {
  Column, Entity, JoinColumn, OneToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, (u) => u.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  nickname: string;

  @Column({ name: 'first_name', type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ name: 'middle_name', type: 'varchar', nullable: true })
  middleName: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  // text[] — массив строк в PostgreSQL
  @Column({ name: 'soft_skills', type: 'text', array: true, default: [] })
  softSkills: string[];

  @Column({ name: 'hard_skills', type: 'text', array: true, default: [] })
  hardSkills: string[];

  @Column({ name: 'is_profile_public', default: true })
  isProfilePublic: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}