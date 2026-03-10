import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GithubAccount, GithubRepo } from '../database/entities';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

@Module({
  imports: [TypeOrmModule.forFeature([GithubAccount, GithubRepo])],
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}