import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { Repository } from 'typeorm';
import {
  AiReport, Profile, Project, ReportStatus, ReportType, User,
} from '../database/entities';
import { GithubRepo } from '../database/entities/github-repo.entity';
import { GenerateReportDto } from './dto/generate-report.dto';

@Injectable()
export class AiService {
  private readonly client: Anthropic;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(AiReport) private readonly reportRepo: Repository<AiReport>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(GithubRepo) private readonly githubRepoRepo: Repository<GithubRepo>,
  ) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY') ?? undefined,
    });
  }

  async generate(currentUser: User, dto: GenerateReportDto): Promise<AiReport> {
    const profile = await this.profileRepo.findOne({ where: { userId: currentUser.id } });
    if (!profile) throw new NotFoundException('Профиль не найден');

    let project: Project | null = null;
    let githubRepo: GithubRepo | null = null;

    if (dto.reportType === ReportType.PROJECT_SUMMARY) {
      if (!dto.projectId) {
        throw new BadRequestException('projectId обязателен для типа project_summary');
      }
      project = await this.projectRepo.findOne({
        where: { id: dto.projectId, userId: currentUser.id },
      });
      if (!project) throw new NotFoundException('Проект не найден');

      if (project.githubRepoId) {
        githubRepo = await this.githubRepoRepo.findOne({ where: { id: project.githubRepoId } });
      }
    }

    // Для ACTIVITY_FIELD и IMPROVEMENTS нужны все проекты пользователя
    let allProjects: Project[] = [];
    if (dto.reportType !== ReportType.PROJECT_SUMMARY) {
      allProjects = await this.projectRepo.find({ where: { userId: currentUser.id } });
    }

    const report = await this.reportRepo.save(
      this.reportRepo.create({
        userId: currentUser.id,
        projectId: dto.projectId ?? null,
        reportType: dto.reportType,
        status: ReportStatus.PENDING,
      }),
    );

    try {
      const prompt = this.buildPrompt(dto.reportType, profile, project, githubRepo, allProjects);
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: this.systemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('\n');

      report.status = ReportStatus.DONE;
      report.summary = text;
      report.rawResponse = message as unknown as Record<string, unknown>;

      // Для ACTIVITY_FIELD — автоматически обновляем профиль
      if (dto.reportType === ReportType.ACTIVITY_FIELD) {
        profile.activityField = text.trim().split('\n')[0].replace(/^[#*\s]+/, '');
        await this.profileRepo.save(profile);
      }
    } catch (err) {
      report.status = ReportStatus.ERROR;
      report.errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    }

    return this.reportRepo.save(report);
  }

  async getMyReports(userId: string): Promise<AiReport[]> {
    return this.reportRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getReport(id: string, userId: string): Promise<AiReport> {
    const report = await this.reportRepo.findOne({ where: { id, userId } });
    if (!report) throw new NotFoundException('Отчёт не найден');
    return report;
  }

  // Получить публичные отчёты пользователя (для чужого профиля)
  async getPublicReports(targetUserId: string): Promise<AiReport[]> {
    return this.reportRepo.find({
      where: { userId: targetUserId, isPublic: true, status: ReportStatus.DONE },
      order: { createdAt: 'DESC' },
    });
  }

  // Переключить видимость отчёта
  async toggleVisibility(id: string, userId: string): Promise<AiReport> {
    const report = await this.reportRepo.findOne({ where: { id, userId } });
    if (!report) throw new NotFoundException('Отчёт не найден');
    report.isPublic = !report.isPublic;
    return this.reportRepo.save(report);
  }

  private systemPrompt(): string {
    return `Ты опытный технический рекрутер и карьерный консультант для IT-специалистов.
Отвечай только на русском языке. Будь конкретным и практичным.
Не добавляй вступлений вроде "Конечно!" или "Отличный вопрос!". Сразу переходи к делу.`;
  }

  private buildPrompt(
    type: ReportType,
    profile: Profile,
    project: Project | null,
    githubRepo: GithubRepo | null,
    allProjects: Project[],
  ): string {
    const skillNames = profile.hardSkills.map((s) => s.name);
    const profileBase = [
      skillNames.length ? `Навыки: ${skillNames.join(', ')}` : null,
      profile.bio ? `О себе: ${profile.bio}` : null,
    ].filter(Boolean).join('\n');

    if (type === ReportType.ACTIVITY_FIELD) {
      const projectsInfo = allProjects.map((p) => [
        `— ${p.title}`,
        p.description ? `  Описание: ${p.description}` : null,
        p.stack.length ? `  Стек: ${p.stack.join(', ')}` : null,
        p.role ? `  Роль: ${p.role}` : null,
      ].filter(Boolean).join('\n')).join('\n\n');

      return `Данные разработчика:
${profileBase}

Проекты:
${projectsInfo || 'Проекты не указаны'}

Определи сферу деятельности этого разработчика (например: "Backend-разработчик", "Fullstack-разработчик", "Frontend-разработчик", "ML-инженер" и т.д.).
Ответ: одна короткая фраза — название сферы деятельности. Без пояснений.`;
    }

    if (type === ReportType.IMPROVEMENTS) {
      const projectsStack = [...new Set(allProjects.flatMap((p) => p.stack))];
      const allSkills = [...new Set([...profile.hardSkills.map((s) => s.name), ...projectsStack])];

      return `Разработчик со следующими навыками и технологиями:
${allSkills.length ? allSkills.join(', ') : 'навыки не указаны'}
${profile.activityField ? `Направление: ${profile.activityField}` : ''}

Составь список рекомендаций "Что изучить дальше":
1. Назови 3-5 конкретных технологий или языков, которые логично освоить следующими
2. Для каждой технологии — одно предложение почему она важна для этого специалиста
3. Укажи один бесплатный ресурс для изучения каждой технологии

Формат: нумерованный список.`;
    }

    if (type === ReportType.PROJECT_SUMMARY && project) {
      const projectInfo = [
        `Название: ${project.title}`,
        project.description ? `Описание: ${project.description}` : null,
        project.role ? `Роль разработчика: ${project.role}` : null,
        project.stack.length ? `Стек: ${project.stack.join(', ')}` : null,
        project.tags.length ? `Теги: ${project.tags.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      const githubInfo = githubRepo ? [
        Object.keys(githubRepo.languages).length
          ? `Языки в репозитории: ${Object.entries(githubRepo.languages)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([l]) => l).join(', ')}`
          : null,
        githubRepo.topics.length ? `Топики GitHub: ${githubRepo.topics.join(', ')}` : null,
        githubRepo.readmeExcerpt ? `README:\n${githubRepo.readmeExcerpt}` : null,
      ].filter(Boolean).join('\n') : null;

      return `Проект разработчика:
${projectInfo}
${githubInfo ? `\nДанные из GitHub:\n${githubInfo}` : ''}

Напиши профессиональное резюме этого проекта для портфолио (3-4 предложения).
Опиши: что это за проект, какие технические решения применялись, в чём ценность проекта.
Пиши в третьем лице, как будто описываешь чужой проект. Без заголовков.`;
    }

    return profileBase;
  }
}
