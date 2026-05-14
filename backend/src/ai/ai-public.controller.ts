import { Controller, Get, Param } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AiService } from './ai.service';

@SkipThrottle({ auth: true })
@Controller('ai/public')
export class AiPublicController {
  constructor(private readonly aiService: AiService) {}

  @Get('projects/:projectId/summary')
  getPublicProjectSummary(@Param('projectId') projectId: string) {
    return this.aiService.getPublicProjectSummaryReport(projectId);
  }

  @Get('projects/:projectId/summary/ensure')
  ensurePublicProjectSummary(@Param('projectId') projectId: string) {
    return this.aiService.ensurePublicProjectSummary(projectId);
  }
}
