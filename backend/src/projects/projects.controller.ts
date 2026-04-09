import {
  Body, Controller, Delete, Get,
  HttpCode, HttpStatus, Param, Patch,
  Post, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/guards/jwt-optional.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

const multerStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // /favorites до /:id, требует авторизацию
  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  getMyFavorites(@CurrentUser() user: User) {
    return this.projectsService.getMyFavorites(user.id);
  }

  // Публичный — без токена isFavorited: false, с токеном — реальное значение
  @Get(':id')
  @UseGuards(JwtOptionalGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: User | null) {
    return this.projectsService.findOne(id, user?.id ?? null);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.remove(id, user.id);
  }

  @Post(':id/files')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadFile(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.projectsService.uploadFile(id, user.id, file);
  }

  @Delete(':id/files/:fileId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.removeFile(id, fileId, user.id);
  }

  @Post(':id/fetch-github')
  @UseGuards(JwtAuthGuard)
  fetchGithubData(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.fetchGithubData(id, user.id);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  addFavorite(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.addFavorite(id, user.id);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFavorite(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.removeFavorite(id, user.id);
  }
}