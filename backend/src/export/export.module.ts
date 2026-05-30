import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  AiReport, ContactLink, Profile, Project, User,
} from '../database/entities';
import { ExportController } from './export.controller';
import { ExportService, PDF_EXPORT_QUEUE } from './export.service';
import { ExportProcessor } from './export.processor';
import { VisualizationModule } from '../visualization/visualization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiReport, User, Profile, ContactLink, Project]),
    BullModule.registerQueue({ name: PDF_EXPORT_QUEUE }),
    VisualizationModule,
  ],
  controllers: [ExportController],
  providers: [ExportService, ExportProcessor],
})
export class ExportModule {}
