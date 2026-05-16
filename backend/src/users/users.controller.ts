import {
  BadRequestException,
  Body, Controller, Delete, Get,
  HttpCode, HttpStatus, Param, Patch,
  Post, Put, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/guards/jwt-optional.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { UpdateContactsDto } from './dto/update-contacts.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { UsersService } from './users.service';

const avatarStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

@SkipThrottle({ auth: true })
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

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: avatarStorage,
    limits: { fileSize: 1 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Разрешены только изображения'), false);
      }
    },
  }))
  uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('Файл не загружен');
    return this.usersService.updateAvatar(user, file);
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAvatar(@CurrentUser() user: User) {
    return this.usersService.deleteAvatar(user);
  }

  @Post('me/sync-skills')
  @UseGuards(JwtAuthGuard)
  syncSkills(@CurrentUser() user: User) {
    return this.usersService.syncHardSkillsFromProjects(user);
  }

  @Get('me/followers')
  @UseGuards(JwtAuthGuard)
  getMyFollowers(@CurrentUser() user: User) {
    return this.usersService.getFollowers(user.id, user.id);
  }

  @Get('me/following')
  @UseGuards(JwtAuthGuard)
  getMyFollowing(@CurrentUser() user: User) {
    return this.usersService.getFollowing(user.id, user.id);
  }

  @Get('top-followed')
  getTopFollowed() {
    return this.usersService.getTopByFollowers(3);
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