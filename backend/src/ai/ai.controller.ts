import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AiService } from './ai.service';
import { GenerateReportDto } from './dto/generate-report.dto';

@SkipThrottle({ auth: true })
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('reports')
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  generate(@CurrentUser() user: User, @Body() dto: GenerateReportDto) {
    return this.aiService.generate(user, dto);
  }

  @Get('reports')
  getMyReports(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.aiService.getMyReports(user.id, pagination);
  }

  @Get('reports/:id')
  getReport(@Param('id') id: string, @CurrentUser() user: User) {
    return this.aiService.getReport(id, user.id);
  }

  @Patch('reports/:id/visibility')
  toggleVisibility(@Param('id') id: string, @CurrentUser() user: User) {
    return this.aiService.toggleVisibility(id, user.id);
  }
}
