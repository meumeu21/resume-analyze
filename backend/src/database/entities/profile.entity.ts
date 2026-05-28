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

  @Column({ name: 'soft_skills', type: 'text', array: true, default: [] })
  softSkills: string[];

  // [{name: "TypeScript", level: 4},]
  @Column({ name: 'skill_levels', type: 'jsonb', default: [] })
  hardSkills: { name: string; level: number }[] = [];

  // {x: -5..5, y: -5..5}
  @Column({ type: 'jsonb', nullable: true })
  coordinates: { x: number; y: number } | null = null;

  // [{name: "Frontend", value: 7}, ...]  value: 0..10
  @Column({ name: 'skill_map', type: 'jsonb', nullable: true })
  skillMap: { name: string; value: number }[] | null = null;

  // {nodes: [{id, label, type, weight}], edges: [{source, target}]}
  @Column({ name: 'network_graph', type: 'jsonb', nullable: true })
  networkGraph: {
    nodes: { id: string; label: string; type: 'technology' | 'domain'; weight: number }[];
    edges: { source: string; target: string }[];
  } | null = null;

  @Column({ name: 'activity_field', type: 'varchar', nullable: true })
  activityField!: string | null;

  @Column({ name: 'is_profile_public', default: true })
  isProfilePublic!: boolean;

  @Column({ name: 'is_followers_public', default: true })
  isFollowersPublic!: boolean;

  @Column({ name: 'is_following_public', default: true })
  isFollowingPublic!: boolean;

  @Column({ name: 'is_favorites_public', default: true })
  isFavoritesPublic!: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
