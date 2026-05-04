import {
  Body, Controller, Delete, Get,
  HttpCode, HttpStatus, Post, UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { ConnectGithubDto } from './dto/connect-github.dto';
import { GithubService } from './github.service';

@SkipThrottle({ auth: true })
@Controller('github')
@UseGuards(JwtAuthGuard)
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post('connect')
  connect(@CurrentUser() user: User, @Body() dto: ConnectGithubDto) {
    return this.githubService.connect(user.id, dto.username);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  sync(@CurrentUser() user: User) {
    return this.githubService.syncRepos(user.id);
  }

  @Get('account')
  getAccount(@CurrentUser() user: User) {
    return this.githubService.getMyAccount(user.id);
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@CurrentUser() user: User) {
    return this.githubService.disconnect(user.id);
  }
}