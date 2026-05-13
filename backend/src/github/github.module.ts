import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GithubAccount, GithubRepo } from '../database/entities';
import { GithubController } from './github.controller';
import { GithubPublicController } from './github-public.controller';
import { GithubService } from './github.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([GithubAccount, GithubRepo]), RedisModule],
  controllers: [GithubController, GithubPublicController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}