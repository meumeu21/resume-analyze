import {
  Column, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ContactLinkType {
  GITHUB = 'github',
  TELEGRAM = 'telegram',
  LINKEDIN = 'linkedin',
  WEBSITE = 'website',
  OTHER = 'other',
}

@Entity('contact_links')
export class ContactLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (u) => u.contactLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ContactLinkType })
  type: ContactLinkType;

  @Column()
  url: string;

  // контакты видны только авторизованным
  @Column({ name: 'is_public', default: false })
  isPublic: boolean;
}