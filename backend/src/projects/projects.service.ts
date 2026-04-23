import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import {
  Favorite, Project, ProjectFile, ProjectFileType, ProjectSource,
} from '../database/entities';
import { GithubService } from '../github/github.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectFile) private readonly fileRepo: Repository<ProjectFile>,
    @InjectRepository(Favorite) private readonly favoriteRepo: Repository<Favorite>,
    private readonly githubService: GithubService,
  ) {}

  // GET /projects/:id
  async findOne(id: string, currentUserId: string | null) {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['files'],
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (!project.isPublic && project.userId !== currentUserId) {
      throw new ForbiddenException('Проект недоступен');
    }

    const [isFavorited, favoritesCount] = await Promise.all([
      currentUserId
        ? this.favoriteRepo.findOne({ where: { userId: currentUserId, projectId: id } })
        : Promise.resolve(null),
      this.favoriteRepo.count({ where: { projectId: id } }),
    ]);

    return { ...project, isFavorited: !!isFavorited, favoritesCount };
  }

  // POST /projects
  async create(userId: string, dto: CreateProjectDto) {
    const project = this.projectRepo.create({ ...dto, userId });
    return this.projectRepo.save(project);
  }

  // PATCH /projects/:id
  async update(id: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException();

    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  // DELETE /projects/:id
  async remove(id: string, userId: string) {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['files'],
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException();

    await Promise.all(project.files.map((file) => this.deleteFileFromDisk(file.fileUrl)));

    await this.projectRepo.remove(project);
  }

  // POST /projects/:id/files
  async uploadFile(projectId: string, userId: string, file: Express.Multer.File) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      await fs.promises.unlink(file.path).catch(() => {});
      throw new NotFoundException('Проект не найден');
    }
    if (project.userId !== userId) {
      await fs.promises.unlink(file.path).catch(() => {});
      throw new ForbiddenException();
    }

    const type = file.mimetype.startsWith('image/')
      ? ProjectFileType.IMAGE
      : ProjectFileType.FILE;

    const projectFile = this.fileRepo.create({
      projectId,
      fileUrl: `/uploads/${file.filename}`,
      originalName: file.originalname,
      type,
    });

    try {
      return await this.fileRepo.save(projectFile);
    } catch (err) {
      await fs.promises.unlink(file.path).catch(() => {});
      throw err;
    }
  }

  // DELETE /projects/:id/files/:fileId
  async removeFile(projectId: string, fileId: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException();

    const file = await this.fileRepo.findOne({ where: { id: fileId, projectId } });
    if (!file) throw new NotFoundException('Файл не найден');

    await this.deleteFileFromDisk(file.fileUrl);
    await this.fileRepo.remove(file);
  }

  // POST /projects/:id/favorite
  async addFavorite(projectId: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId, isPublic: true } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId === userId) throw new ConflictException('Нельзя добавить свой проект в избранное');

    const existing = await this.favoriteRepo.findOne({ where: { userId, projectId } });
    if (existing) throw new ConflictException('Уже в избранном');

    await this.favoriteRepo.save(this.favoriteRepo.create({ userId, projectId }));
  }

  // DELETE /projects/:id/favorite
  async removeFavorite(projectId: string, userId: string) {
    const fav = await this.favoriteRepo.findOne({ where: { userId, projectId } });
    if (!fav) throw new NotFoundException('Не найдено в избранном');
    await this.favoriteRepo.remove(fav);
  }

  // GET /projects/favorites
  async getMyFavorites(userId: string) {
    const favorites = await this.favoriteRepo.find({
      where: { userId },
      relations: ['project', 'project.files'],
      order: { createdAt: 'DESC' },
    });
    return favorites.map((f) => f.project);
  }

  // POST /projects/:id/fetch-github
  async fetchGithubData(projectId: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException();
    if (!project.repoUrl) throw new NotFoundException('У проекта не указан repoUrl');

    const repo = await this.githubService.fetchRepoByUrl(project.repoUrl);

    project.githubRepoId = repo.id;
    project.source = ProjectSource.GITHUB;
    await this.projectRepo.save(project);

    return repo;
  }

  private async deleteFileFromDisk(fileUrl: string): Promise<void> {
    const filePath = path.join(process.cwd(), fileUrl);
    await fs.promises.unlink(filePath).catch(() => {});
  }
}