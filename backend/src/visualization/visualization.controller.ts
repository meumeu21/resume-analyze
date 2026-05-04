import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/guards/jwt-optional.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { VisualizationService } from './visualization.service';

@SkipThrottle({ auth: true })
@Controller('visualization')
export class VisualizationController {
  constructor(private readonly visualizationService: VisualizationService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyVisualization(@CurrentUser() user: User) {
    return this.visualizationService.getMyVisualizationData(user.id);
  }

  @Get(':userId')
  @UseGuards(JwtOptionalGuard)
  getVisualization(@Param('userId') userId: string) {
    return this.visualizationService.getVisualizationData(userId);
  }
}
