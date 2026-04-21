import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  ContactLink, Profile, Project, User,
} from '../database/entities';
import { ExportController } from './export.controller';
import { ExportService, PDF_EXPORT_QUEUE } from './export.service';
import { ExportProcessor } from './export.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, ContactLink, Project]),
    BullModule.registerQueue({ name: PDF_EXPORT_QUEUE }),
  ],
  controllers: [ExportController],
  providers: [ExportService, ExportProcessor],
})
export class ExportModule {}
