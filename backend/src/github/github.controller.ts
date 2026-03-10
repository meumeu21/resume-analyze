import {
  Body, Controller, Delete, Get,
  HttpCode, HttpStatus, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { ConnectGithubDto } from './dto/connect-github.dto';
import { GithubService } from './github.service';

@Controller('github')
@UseGuards(JwtAuthGuard)
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  // Подключить GitHub аккаунт (+ сразу синхронизирует репо)
  @Post('connect')
  connect(@CurrentUser() user: User, @Body() dto: ConnectGithubDto) {
    return this.githubService.connect(user.id, dto.username);
  }

  // Повторная синхронизация репозиториев
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  sync(@CurrentUser() user: User) {
    return this.githubService.syncRepos(user.id);
  }

  // Мой подключённый аккаунт и репозитории
  @Get('account')
  getAccount(@CurrentUser() user: User) {
    return this.githubService.getMyAccount(user.id);
  }

  // Отвязать GitHub аккаунт
  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@CurrentUser() user: User) {
    return this.githubService.disconnect(user.id);
  }
}