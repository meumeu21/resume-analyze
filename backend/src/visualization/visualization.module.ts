import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile, Project } from '../database/entities';
import { VisualizationController } from './visualization.controller';
import { VisualizationService } from './visualization.service';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, Project])],
  controllers: [VisualizationController],
  providers: [VisualizationService],
})
export class VisualizationModule {}
