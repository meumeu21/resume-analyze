import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReportType } from '../../database/entities/ai-report.entity';

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType!: ReportType;

  // Обязателен только для PROJECT_SUMMARY
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
