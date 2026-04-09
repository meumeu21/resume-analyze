import {
  Body, Controller, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { AiService } from './ai.service';
import { GenerateReportDto } from './dto/generate-report.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // POST /ai/reports — сгенерировать отчёт
  @Post('reports')
  generate(@CurrentUser() user: User, @Body() dto: GenerateReportDto) {
    return this.aiService.generate(user, dto);
  }

  // GET /ai/reports — мои отчёты
  @Get('reports')
  getMyReports(@CurrentUser() user: User) {
    return this.aiService.getMyReports(user.id);
  }

  // GET /ai/reports/:id — конкретный отчёт
  @Get('reports/:id')
  getReport(@Param('id') id: string, @CurrentUser() user: User) {
    return this.aiService.getReport(id, user.id);
  }

  // PATCH /ai/reports/:id/visibility — переключить публичность
  @Patch('reports/:id/visibility')
  toggleVisibility(@Param('id') id: string, @CurrentUser() user: User) {
    return this.aiService.toggleVisibility(id, user.id);
  }
}
