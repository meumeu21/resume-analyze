import {
  Body, Controller, Delete, Get,
  HttpCode, HttpStatus, Param, Patch,
  Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { UpdateContactsDto } from './dto/update-contacts.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: UsersQueryDto, @CurrentUser() user: User) {
    return this.usersService.findAll(query, user.id);
  }

  // /me должен быть до /:id
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.usersService.getMyProfile(user);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user, dto);
  }

  @Put('me/contacts')
  updateContacts(@CurrentUser() user: User, @Body() dto: UpdateContactsDto) {
    return this.usersService.updateContacts(user, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.findOne(id, user.id);
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  follow(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.follow(user.id, id);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollow(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.unfollow(user.id, id);
  }
}
