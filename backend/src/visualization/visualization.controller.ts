import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/guards/jwt-optional.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { VisualizationService } from './visualization.service';

@Controller('visualization')
export class VisualizationController {
  constructor(private readonly visualizationService: VisualizationService) {}

  // Свои данные (все проекты, включая приватные)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyVisualization(@CurrentUser() user: User) {
    return this.visualizationService.getMyVisualizationData(user.id);
  }

  // Чужой профиль (только публичные проекты)
  @Get(':userId')
  @UseGuards(JwtOptionalGuard)
  getVisualization(@Param('userId') userId: string) {
    return this.visualizationService.getVisualizationData(userId);
  }
}
