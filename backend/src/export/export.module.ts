import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ContactLink, Profile, Project, User,
} from '../database/entities';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Profile, ContactLink, Project])],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
