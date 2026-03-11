import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ContactLink, Follow, Profile, Project, User,
} from '../database/entities';
import { UpdateContactsDto } from './dto/update-contacts.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersQueryDto } from './dto/users-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    @InjectRepository(ContactLink) private readonly contactRepo: Repository<ContactLink>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  // GET /users
  async findAll(query: UsersQueryDto, currentUserId: string | null) {
    const qb = this.profileRepo
      .createQueryBuilder('profile')
      .where('profile.isProfilePublic = true');

    if (query.activityField) {
      qb.andWhere('profile.activityField = :activityField', {
        activityField: query.activityField,
      });
    }

    if (query.stack?.length) {
      qb.andWhere('profile.hardSkills && :stack', { stack: query.stack });
    }

    if (query.tools?.length) {
      qb.andWhere('profile.tools && :tools', { tools: query.tools });
    }

    const hasFilters = query.activityField || query.stack?.length || query.tools?.length;

    if (!hasFilters) {
      qb.orderBy('RANDOM()');
    }

    qb.take(10);

    const profiles = await qb.getMany();
    return Promise.all(profiles.map((p) => this.toUserCard(p, currentUserId)));
  }

  // GET /users/me
  async getMyProfile(currentUser: User) {
    const profile = await this.profileRepo.findOne({
      where: { userId: currentUser.id },
    });
    if (!profile) throw new NotFoundException('Профиль не найден');

    const [contacts, projects, followersCount, followingCount] = await Promise.all([
      this.contactRepo.find({ where: { userId: currentUser.id } }),
      this.projectRepo.find({ where: { userId: currentUser.id }, order: { createdAt: 'DESC' } }),
      this.followRepo.count({ where: { followingId: currentUser.id } }),
      this.followRepo.count({ where: { followerId: currentUser.id } }),
    ]);

    return {
      userId: currentUser.id,
      email: currentUser.email,
      ...this.profileFields(profile),
      followersCount,
      followingCount,
      contacts,
      projects,
    };
  }

  // GET /users/:id
  async findOne(targetId: string, currentUserId: string | null) {
    const profile = await this.profileRepo.findOne({
      where: { userId: targetId, isProfilePublic: true },
    });
    if (!profile) throw new NotFoundException('Пользователь не найден');

    const [contacts, publicProjects, followersCount, isFollowing] = await Promise.all([
      this.contactRepo.find({ where: { userId: targetId, isPublic: true } }),
      this.projectRepo.find({
        where: { userId: targetId, isPublic: true },
        order: { createdAt: 'DESC' },
      }),
      this.followRepo.count({ where: { followingId: targetId } }),
      currentUserId
        ? this.followRepo.findOne({ where: { followerId: currentUserId, followingId: targetId } })
        : Promise.resolve(null),
    ]);

    return {
      userId: targetId,
      ...this.profileFields(profile),
      followersCount,
      isFollowing: !!isFollowing,
      contacts,
      publicProjects,
    };
  }

  // PATCH /users/me
  async updateProfile(currentUser: User, dto: UpdateProfileDto) {
    const profile = await this.profileRepo.findOne({
      where: { userId: currentUser.id },
    });
    if (!profile) throw new NotFoundException('Профиль не найден');

    if (dto.nickname && dto.nickname !== profile.nickname) {
      const exists = await this.profileRepo.findOne({ where: { nickname: dto.nickname } });
      if (exists) throw new ConflictException('Никнейм уже занят');
    }

    Object.assign(profile, dto);
    return this.profileRepo.save(profile);
  }

  // PUT /users/me/contacts
  async updateContacts(currentUser: User, dto: UpdateContactsDto) {
    await this.contactRepo.delete({ userId: currentUser.id });

    const contacts = dto.contacts.map((c) =>
      this.contactRepo.create({ ...c, userId: currentUser.id }),
    );

    return this.contactRepo.save(contacts);
  }

  // POST /users/:id/follow
  async follow(currentUserId: string, targetId: string) {
    if (currentUserId === targetId) {
      throw new ConflictException('Нельзя подписаться на самого себя');
    }

    const target = await this.userRepo.findOne({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Пользователь не найден');

    const existing = await this.followRepo.findOne({
      where: { followerId: currentUserId, followingId: targetId },
    });
    if (existing) throw new ConflictException('Вы уже подписаны');

    const follow = this.followRepo.create({
      followerId: currentUserId,
      followingId: targetId,
    });
    await this.followRepo.save(follow);
  }

  // DELETE /users/:id/follow
  async unfollow(currentUserId: string, targetId: string) {
    const follow = await this.followRepo.findOne({
      where: { followerId: currentUserId, followingId: targetId },
    });
    if (!follow) throw new NotFoundException('Подписка не найдена');

    await this.followRepo.remove(follow);
  }

  // хелперы

  private profileFields(profile: Profile) {
    return {
      nickname: profile.nickname,
      firstName: profile.firstName,
      lastName: profile.lastName,
      middleName: profile.middleName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      softSkills: profile.softSkills,
      hardSkills: profile.hardSkills,
      tools: profile.tools,
      activityField: profile.activityField,
      isProfilePublic: profile.isProfilePublic,
      updatedAt: profile.updatedAt,
    };
  }

  private async toUserCard(profile: Profile, currentUserId: string | null) {
    const [followersCount, isFollowingRecord] = await Promise.all([
      this.followRepo.count({ where: { followingId: profile.userId } }),
      currentUserId
        ? this.followRepo.findOne({ where: { followerId: currentUserId, followingId: profile.userId } })
        : Promise.resolve(null),
    ]);

    return {
      userId: profile.userId,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
      activityField: profile.activityField,
      softSkills: profile.softSkills,
      hardSkills: profile.hardSkills,
      tools: profile.tools,
      followersCount,
      isFollowing: !!isFollowingRecord,
    };
  }
}