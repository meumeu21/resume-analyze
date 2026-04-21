import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  AiReport, Profile, Project,
} from '../database/entities';
import { GithubRepo } from '../database/entities/github-repo.entity';
import { AiController } from './ai.controller';
import { AiService, AI_REPORTS_QUEUE } from './ai.service';
import { AiProcessor } from './ai.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiReport, Profile, Project, GithubRepo]),
    BullModule.registerQueue({ name: AI_REPORTS_QUEUE }),
  ],
  controllers: [AiController],
  providers: [AiService, AiProcessor],
  exports: [AiService],
})
export class AiModule {}
