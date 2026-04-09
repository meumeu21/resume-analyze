import {
  Body, Controller, Delete, Get,
  HttpCode, HttpStatus, Param, Patch,
  Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/guards/jwt-optional.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { UpdateContactsDto } from './dto/update-contacts.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtOptionalGuard)
  findAll(@Query() query: UsersQueryDto, @CurrentUser() user: User | null) {
    return this.usersService.findAll(query, user?.id ?? null);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: User) {
    return this.usersService.getMyProfile(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user, dto);
  }

  @Put('me/contacts')
  @UseGuards(JwtAuthGuard)
  updateContacts(@CurrentUser() user: User, @Body() dto: UpdateContactsDto) {
    return this.usersService.updateContacts(user, dto);
  }

  @Post('me/sync-skills')
  @UseGuards(JwtAuthGuard)
  syncSkills(@CurrentUser() user: User) {
    return this.usersService.syncHardSkillsFromProjects(user);
  }

  @Get(':id')
  @UseGuards(JwtOptionalGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: User | null) {
    return this.usersService.findOne(id, user?.id ?? null);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  follow(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.follow(user.id, id);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollow(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.unfollow(user.id, id);
  }
}