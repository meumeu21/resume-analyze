import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('profile_views')
export class ProfileView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'profile_owner_id' })
  profileOwnerId: string;

  @ManyToOne(() => User, (u) => u.profileViews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_owner_id' })
  profileOwner: User;

  @Column({ name: 'viewer_id', type: 'varchar', nullable: true })
  viewerId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'viewer_id' })
  viewer: User | null;

  @CreateDateColumn({ name: 'viewed_at' })
  viewedAt: Date;
}