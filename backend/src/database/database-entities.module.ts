import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User, Profile, ContactLink, Project,
  GithubAccount, GithubRepo, AiReport,
  PasswordResetToken, ProfileView,
  ProjectFile, Favorite, Follow,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Profile, ContactLink, Project,
      GithubAccount, GithubRepo, AiReport,
      PasswordResetToken, ProfileView,
      ProjectFile, Favorite, Follow,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseEntitiesModule {}