import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ContactLink, Favorite, Follow, Profile, Project, User,
} from '../database/entities';
import { PagedResult } from '../common/dto/pagination.dto';
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
    @InjectRepository(Favorite) private readonly favoriteRepo: Repository<Favorite>,
  ) {}

  async findAll(query: UsersQueryDto, currentUserId: string | null): Promise<PagedResult<object>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.profileRepo
      .createQueryBuilder('profile')
      .where('profile.isProfilePublic = true');

    if (query.search) {
      qb.andWhere(
        `(profile.nickname ILIKE :search
          OR profile.firstName ILIKE :search
          OR profile.lastName ILIKE :search
          OR CONCAT(profile.firstName, ' ', profile.lastName) ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }

    if (query.activityField) {
      qb.andWhere('profile.activityField = :activityField', { activityField: query.activityField });
    }

    if (query.skills?.length) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements(profile.skill_levels) AS s
          WHERE s->>'name' = ANY(:skills)
        )`,
        { skills: query.skills },
      );
    }

    if (query.softSkills?.length) {
      qb.andWhere('profile.softSkills && :softSkills', { softSkills: query.softSkills });
    }

    const hasFilters = query.search || query.activityField
      || query.skills?.length || query.softSkills?.length;

    if (!hasFilters) {
      qb.orderBy('RANDOM()');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [profiles, total] = await qb.getManyAndCount();
    const data = await Promise.all(profiles.map((p) => this.toUserCard(p, currentUserId)));

    return { data, total, page, limit };
  }

  async getMyProfile(currentUser: User) {
    const profile = await this.profileRepo.findOne({
      where: { userId: currentUser.id },
    });
    if (!profile) throw new NotFoundException('Профиль не найден');

    const [contacts, projects, followersCount, followingCount, favoritesCount] = await Promise.all([
      this.contactRepo.find({ where: { userId: currentUser.id } }),
      this.projectRepo.find({ where: { userId: currentUser.id }, order: { createdAt: 'DESC' } }),
      this.followRepo.count({ where: { followingId: currentUser.id } }),
      this.followRepo.count({ where: { followerId: currentUser.id } }),
      this.favoriteRepo.count({ where: { userId: currentUser.id } }),
    ]);

    return {
      userId: currentUser.id,
      email: currentUser.email,
      ...this.profileFields(profile),
      followersCount,
      followingCount,
      favoritesCount,
      contacts,
      projects,
    };
  }

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

  async updateContacts(currentUser: User, dto: UpdateContactsDto) {
    await this.contactRepo.delete({ userId: currentUser.id });

    const contacts = dto.contacts.map((c) =>
      this.contactRepo.create({ ...c, userId: currentUser.id }),
    );

    return this.contactRepo.save(contacts);
  }

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

  async unfollow(currentUserId: string, targetId: string) {
    const follow = await this.followRepo.findOne({
      where: { followerId: currentUserId, followingId: targetId },
    });
    if (!follow) throw new NotFoundException('Подписка не найдена');

    await this.followRepo.remove(follow);
  }

  // хелперы

  async syncHardSkillsFromProjects(currentUser: User) {
    const profile = await this.profileRepo.findOne({ where: { userId: currentUser.id } });
    if (!profile) throw new NotFoundException('Профиль не найден');

    const projects = await this.projectRepo.find({
      where: { userId: currentUser.id },
      select: ['stack'],
    });

    const fromProjects = [...new Set(projects.flatMap((p) => p.stack))];
    const existingNames = new Set(profile.hardSkills.map((s) => s.name.toLowerCase()));

    const newSkills = fromProjects
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .map((name) => ({ name, level: 1 }));

    profile.hardSkills = [...profile.hardSkills, ...newSkills];
    return this.profileRepo.save(profile);
  }

  private profileFields(profile: Profile) {
    return {
      nickname: profile.nickname,
      firstName: profile.firstName,
      lastName: profile.lastName,
      middleName: profile.middleName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      softSkills: profile.softSkills,
      hardSkills: profile.hardSkills, // [{name, level}]
      coordinates: profile.coordinates,
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
      hardSkills: profile.hardSkills, // [{name, level}]
      followersCount,
      isFollowing: !!isFollowingRecord,
    };
  }
}