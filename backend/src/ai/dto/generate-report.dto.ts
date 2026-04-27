import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReportType } from '../../database/entities/ai-report.entity';

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType!: ReportType;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
