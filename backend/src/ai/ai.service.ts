import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import OpenAI from 'openai';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

import {
  AiReport, Profile, Project, ReportStatus, ReportType, User,
} from '../database/entities';
import { GithubRepo } from '../database/entities/github-repo.entity';
import { PagedResult, PaginationDto } from '../common/dto/pagination.dto';
import { GenerateReportDto } from './dto/generate-report.dto';

export const AI_REPORTS_QUEUE = 'ai-reports';

export const DEVELOPER_CATEGORIES = [
  'Frontend-разработчик',
  'Backend-разработчик',
  'Full-Stack разработчик',
  'Мобильный разработчик',
  'Data Scientist',
  'ML-инженер',
  'DevOps-инженер',
  'QA-инженер',
  'Разработчик игр',
  'Blockchain-разработчик',
  'Embedded-разработчик',
  'Security-инженер',
  'Cloud-инженер',
  'Архитектор / Tech Lead',
] as const;

interface ResumeData {
  first_name: string;
  last_name: string;
  job_title: string;
  about: string;
  hard_skills: string;
  soft_skills: string;
  projects: string;
}

interface ImprovementRecommendation {
  title: string;
  description: string;
}

interface ProjectIdea {
  title: string;
  description: string;
  stack: string[];
  benefit: string;
}

interface ImprovementsData {
  recommendations: ImprovementRecommendation[];
  project_ideas: ProjectIdea[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(AiReport) private readonly reportRepo: Repository<AiReport>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(GithubRepo) private readonly githubRepoRepo: Repository<GithubRepo>,
    @InjectQueue(AI_REPORTS_QUEUE) private readonly aiQueue: Queue,
  ) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('GEMINI_API_KEY'),
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  }

  async generate(currentUser: User, dto: GenerateReportDto): Promise<AiReport> {
    const profile = await this.profileRepo.findOne({ where: { userId: currentUser.id } });
    if (!profile) throw new NotFoundException('Профиль не найден');

    if (dto.reportType === ReportType.PROJECT_SUMMARY) {
      if (!dto.projectId) {
        throw new BadRequestException('projectId обязателен для типа project_summary');
      }
      const project = await this.projectRepo.findOne({
        where: { id: dto.projectId, userId: currentUser.id },
      });
      if (!project) throw new NotFoundException('Проект не найден');
    }

    const report = await this.reportRepo.save(
      this.reportRepo.create({
        userId: currentUser.id,
        projectId: dto.projectId ?? null,
        reportType: dto.reportType,
        status: ReportStatus.PENDING,
      }),
    );

    await this.aiQueue.add('process-report', { reportId: report.id }, {
      attempts: 1,
    });
    this.logger.log(`AI report ${report.id} queued`);

    return report;
  }

  async processReport(reportId: string): Promise<void> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) return;

    const profile = await this.profileRepo.findOne({ where: { userId: report.userId } });
    if (!profile) {
      report.status = ReportStatus.ERROR;
      report.errorMessage = 'Профиль не найден';
      await this.reportRepo.save(report);
      return;
    }

    if (report.reportType === ReportType.RESUME) {
      await this.processResumeReport(report, profile);
      return;
    }

    if (report.reportType === ReportType.IMPROVEMENTS) {
      await this.processImprovementsReport(report, profile);
      return;
    }

    let project: Project | null = null;
    let githubRepo: GithubRepo | null = null;
    let allProjects: Project[] = [];

    if (report.reportType === ReportType.PROJECT_SUMMARY && report.projectId) {
      project = await this.projectRepo.findOne({ where: { id: report.projectId } });
      if (project?.githubRepoId) {
        githubRepo = await this.githubRepoRepo.findOne({ where: { id: project.githubRepoId } });
      }
    } else {
      allProjects = await this.projectRepo.find({ where: { userId: report.userId } });
    }

    try {
      const prompt = this.buildPrompt(report.reportType, profile, project, githubRepo, allProjects);
      const completion = await this.client.chat.completions.create({
        model: 'gemini-2.5-flash',
        max_tokens: 1500,
        messages: [
          { role: 'system', content: this.systemPrompt() },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? '';

      report.status = ReportStatus.DONE;
      report.summary = text;
      report.rawResponse = completion as unknown as Record<string, unknown>;

      if (report.reportType === ReportType.ACTIVITY_FIELD) {
        profile.activityField = text.trim().split('\n')[0].replace(/^[#*\s]+/, '');
        await this.profileRepo.save(profile);
      }
    } catch (err) {
      report.status = ReportStatus.ERROR;
      report.errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      this.logger.error(`AI report ${reportId} failed: ${report.errorMessage}`);
    }

    await this.reportRepo.save(report);
    this.logger.log(`AI report ${reportId} finished with status ${report.status}`);
  }

  private async processResumeReport(report: AiReport, profile: Profile): Promise<void> {
    const publicProjects = await this.projectRepo.find({
      where: { userId: report.userId, isPublic: true },
      order: { createdAt: 'DESC' },
    });

    try {
      const prompt = this.buildResumePrompt(profile, publicProjects);
      const completion = await this.client.chat.completions.create({
        model: 'gemini-2.5-flash',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: this.resumeSystemPrompt() },
          { role: 'user', content: prompt },
        ],
      });

      const rawText = completion.choices[0]?.message?.content ?? '';
      const resumeData: ResumeData = JSON.parse(this.extractJson(rawText));

      report.status = ReportStatus.DONE;
      report.rawResponse = resumeData as unknown as Record<string, unknown>;
      report.summary = this.formatResumeSummary(resumeData);
    } catch (err) {
      report.status = ReportStatus.ERROR;
      report.errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      this.logger.error(`Resume report ${report.id} failed: ${report.errorMessage}`);
    }

    await this.reportRepo.save(report);
    this.logger.log(`Resume report ${report.id} finished with status ${report.status}`);
  }

  private async processImprovementsReport(report: AiReport, profile: Profile): Promise<void> {
    const allProjects = await this.projectRepo.find({ where: { userId: report.userId } });

    try {
      const prompt = this.buildImprovementsPrompt(profile, allProjects);
      const completion = await this.client.chat.completions.create({
        model: 'gemini-2.5-flash',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: this.systemPrompt() },
          { role: 'user', content: prompt },
        ],
      });

      const rawText = completion.choices[0]?.message?.content ?? '';
      const data: ImprovementsData = JSON.parse(this.extractJson(rawText));

      report.status = ReportStatus.DONE;
      report.rawResponse = data as unknown as Record<string, unknown>;
      report.summary = this.formatImprovementsSummary(data);
    } catch (err) {
      report.status = ReportStatus.ERROR;
      report.errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      this.logger.error(`Improvements report ${report.id} failed: ${report.errorMessage}`);
    }

    await this.reportRepo.save(report);
    this.logger.log(`Improvements report ${report.id} finished with status ${report.status}`);
  }

  async generateResumeDocx(reportId: string, userId: string): Promise<Buffer> {
    const report = await this.reportRepo.findOne({ where: { id: reportId, userId } });
    if (!report) throw new NotFoundException('Отчёт не найден');
    if (report.reportType !== ReportType.RESUME) throw new BadRequestException('Не является отчётом резюме');
    if (report.status !== ReportStatus.DONE) throw new BadRequestException('Отчёт ещё не готов');
    if (!report.rawResponse) throw new BadRequestException('Нет данных резюме');

    const data = report.rawResponse as unknown as ResumeData;

    const templatePath = path.join(process.cwd(), 'templates', 'resume-template.docx');
    const content = fs.readFileSync(templatePath);

    const zip = new PizZip(content);

    // Добавляем плейсхолдеры для полей, которые в шаблоне пока без фигурных скобок
    const docFile = zip.file('word/document.xml');
    if (!docFile) throw new Error('Шаблон резюме повреждён: нет document.xml');
    let docXml = docFile.asText();
    docXml = docXml
      .replace(/<w:t>N A M E<\/w:t>/g, '<w:t>{first_name}</w:t>')
      .replace(/<w:t>S U R N A M E<\/w:t>/g, '<w:t>{last_name}</w:t>')
      .replace(/<w:t>J O B   T I T L E<\/w:t>/g, '<w:t>{job_title}</w:t>');
    zip.file('word/document.xml', docXml);

    const doc = new Docxtemplater(zip, { linebreaks: true, paragraphLoop: true });

    doc.render({
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      job_title: data.job_title || '',
      about: data.about || '',
      hard_skills: data.hard_skills || '',
      soft_skills: data.soft_skills || '',
      projects: data.projects || '',
    });

    return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
  }

  async getProjectSummaryReport(userId: string, projectId: string): Promise<AiReport | null> {
    return this.reportRepo.findOne({
      where: { userId, projectId, reportType: ReportType.PROJECT_SUMMARY },
      order: { createdAt: 'DESC' },
    });
  }

  async getPublicProjectSummaryReport(projectId: string): Promise<AiReport | null> {
    return this.reportRepo.findOne({
      where: { projectId, reportType: ReportType.PROJECT_SUMMARY, isPublic: true, status: ReportStatus.DONE },
      order: { createdAt: 'DESC' },
    });
  }

  async getMyReports(userId: string, pagination: PaginationDto): Promise<PagedResult<AiReport>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await this.reportRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getReport(id: string, userId: string): Promise<AiReport> {
    const report = await this.reportRepo.findOne({ where: { id, userId } });
    if (!report) throw new NotFoundException('Отчёт не найден');
    return report;
  }

  async getPublicReports(targetUserId: string, pagination: PaginationDto): Promise<PagedResult<AiReport>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await this.reportRepo.findAndCount({
      where: { userId: targetUserId, isPublic: true, status: ReportStatus.DONE },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async toggleVisibility(id: string, userId: string): Promise<AiReport> {
    const report = await this.reportRepo.findOne({ where: { id, userId } });
    if (!report) throw new NotFoundException('Отчёт не найден');
    report.isPublic = !report.isPublic;
    return this.reportRepo.save(report);
  }

  private resumeSystemPrompt(): string {
    return `Ты профессиональный HR-копирайтер для IT-специалистов.
Твоя задача — не просто скопировать данные, а превратить их в сильный, живой текст резюме.
Интерпретируй навыки и опыт выгодно: покажи сильные стороны, раскрой ценность каждого умения.
Пиши по-русски, профессионально, без клише. Без воды, но убедительно.
Отвечай ТОЛЬКО JSON-объектом без markdown, без пояснений, без лишнего текста.
Если данных нет — оставь поле пустой строкой.`;
  }

  private buildResumePrompt(profile: Profile, publicProjects: Project[]): string {
    const skillNames = profile.hardSkills.map((s) => `${s.name} (уровень ${s.level}/5)`);

    const projectsText = publicProjects.length
      ? publicProjects.map((p) => [
          `- ${p.title}${p.role ? ` (роль: ${p.role})` : ''}`,
          p.description ? `  Описание: ${p.description}` : null,
          p.stack.length ? `  Стек: ${p.stack.join(', ')}` : null,
          p.tags.length ? `  Теги: ${p.tags.join(', ')}` : null,
        ].filter(Boolean).join('\n')).join('\n\n')
      : 'Публичные проекты не указаны';

    return `Вот сырые данные разработчика. На их основе создай текст для резюме — не просто форматируй, а осмысли и улучши.

=== ДАННЫЕ ПРОФИЛЯ ===
Имя: ${profile.firstName || '(не указано)'}
Фамилия: ${profile.lastName || '(не указано)'}
Сфера деятельности: ${profile.activityField || 'не указана'}
О себе (черновик): ${profile.bio || 'не указано'}
Технические навыки: ${skillNames.length ? skillNames.join(', ') : 'не указаны'}
Soft skills: ${profile.softSkills.length ? profile.softSkills.join(', ') : 'не указаны'}

=== ПУБЛИЧНЫЕ ПРОЕКТЫ ===
${projectsText}

=== ИНСТРУКЦИИ ===
Создай JSON со следующими полями. В каждом поле пиши связный, живой текст — не просто копируй данные:

- "first_name": имя (берёшь как есть)
- "last_name": фамилия (берёшь как есть)
- "job_title": определи точную должность на английском (например: Frontend Developer, Full-Stack Engineer, Python Developer)
- "about": 2-3 предложения — профессиональный summary. Расскажи кто этот разработчик, что умеет, чем ценен. Опирайся на навыки и проекты.
- "hard_skills": 1-2 предложения про технические компетенции. Выдели главную экспертизу, покажи как навыки дополняют друг друга. Например: "Уверенное владение Python как основным языком разработки, дополненное знанием Java для enterprise-задач."
- "soft_skills": 1-2 предложения, раскрывающие личные качества через их практическую ценность. Не просто перечисляй — объясняй зачем они важны.
- "projects": для каждого публичного проекта — одна строка с переносом: "Название\\nОписание: что сделано, какую задачу решает, почему это круто. Стек: ...". Если проектов нет — пустая строка.

Верни ТОЛЬКО JSON:
{
  "first_name": "...",
  "last_name": "...",
  "job_title": "...",
  "about": "...",
  "hard_skills": "...",
  "soft_skills": "...",
  "projects": "..."
}`;
  }

  private formatResumeSummary(data: ResumeData): string {
    const lines: string[] = [];
    if (data.job_title) lines.push(data.job_title);
    if (data.first_name || data.last_name) lines.push(`${data.first_name} ${data.last_name}`.trim());
    if (lines.length) lines.push('');

    if (data.about) {
      lines.push('О себе:');
      lines.push(data.about);
      lines.push('');
    }
    if (data.hard_skills) {
      lines.push('Инструменты:');
      lines.push(data.hard_skills);
      lines.push('');
    }
    if (data.soft_skills) {
      lines.push('Soft Skills:');
      lines.push(data.soft_skills);
      lines.push('');
    }
    if (data.projects) {
      lines.push('Проекты:');
      lines.push(data.projects);
    }

    return lines.join('\n');
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
      const projectsInfo = allProjects.length
        ? allProjects.map((p) => [
            `— ${p.title}`,
            p.description ? `  Описание: ${p.description}` : null,
            p.stack.length ? `  Стек: ${p.stack.join(', ')}` : null,
            p.role ? `  Роль: ${p.role}` : null,
          ].filter(Boolean).join('\n')).join('\n\n')
        : 'Проекты не указаны';

      const categoriesList = DEVELOPER_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n');

      return `Определи категорию разработчика на основе его данных.

ВАЖНО: проекты — главный критерий, они отражают реальную специализацию лучше любых слов.

=== ПРОЕКТЫ (анализируй в первую очередь) ===
${projectsInfo}

=== ПРОФИЛЬ ===
${profileBase || 'Данные профиля не заполнены'}

=== ДОПУСТИМЫЕ КАТЕГОРИИ ===
${categoriesList}

Выбери ОДНУ категорию из списка выше, которая точнее всего описывает специализацию этого разработчика.
Верни ТОЛЬКО название категории — без номера, без кавычек, без пояснений. Ровно одну строку.`;
    }

    if (type === ReportType.IMPROVEMENTS) {
      const projectsStack = [...new Set(allProjects.flatMap((p) => p.stack))];
      const allSkills = [...new Set([...profile.hardSkills.map((s) => s.name), ...projectsStack])];

      return `Разработчик со следующими навыками и технологиями: ${allSkills.length ? allSkills.join(', ') : 'навыки не указаны'}
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

  private extractJson(text: string): string {
    const stripped = text.replace(/```(?:json)?/g, '').replace(/```/g, '');
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw new Error('AI вернул некорректный JSON');
    return stripped.slice(start, end + 1);
  }

  private buildImprovementsPrompt(profile: Profile, allProjects: Project[]): string {
    const skillNames = profile.hardSkills.map((s) => `${s.name} (уровень ${s.level}/5)`);
    const projectsStack = [...new Set(allProjects.flatMap((p) => p.stack))];

    const projectsInfo = allProjects.length
      ? allProjects.map((p) => [
          `— ${p.title}`,
          p.description ? `  Описание: ${p.description}` : null,
          p.stack.length ? `  Стек: ${p.stack.join(', ')}` : null,
          p.role ? `  Роль: ${p.role}` : null,
        ].filter(Boolean).join('\n')).join('\n\n')
      : 'Проекты не указаны';

    return `Ты анализируешь профиль разработчика и даёшь персонализированные рекомендации.

=== ПРОФИЛЬ ===
Класс разработчика: ${profile.activityField || 'не определён'}
Навыки: ${skillNames.length ? skillNames.join(', ') : 'не указаны'}
Soft skills: ${profile.softSkills.length ? profile.softSkills.join(', ') : 'не указаны'}
О себе: ${profile.bio || 'не заполнено'}

=== ПРОЕКТЫ (анализируй в первую очередь) ===
${projectsInfo}

Весь технологический стек из проектов: ${projectsStack.length ? projectsStack.join(', ') : 'не указан'}

=== ЗАДАЧА ===
На основе этих данных дай разработчику конкретные, персонализированные рекомендации.
Используй реальные данные — не пиши общих фраз.

Верни ТОЛЬКО JSON (без markdown, без пояснений):
{
  "recommendations": [
    {
      "title": "Краткое название аспекта (3-6 слов)",
      "description": "1-3 предложения: что конкретно улучшить и почему это важно для этого разработчика"
    }
  ],
  "project_ideas": [
    {
      "title": "Название проекта",
      "description": "2-3 предложения: что это за проект и какую задачу решает",
      "stack": ["Технология1", "Технология2"],
      "benefit": "1 предложение: что конкретно даст реализация этого проекта данному разработчику"
    }
  ]
}

Требования:
- recommendations: от 3 до 5 пунктов, конкретных и применимых
- project_ideas: от 1 до 3 идей
- stack в project_ideas: массив строк (названия технологий)
- Всё на русском языке`;
  }

  private formatImprovementsSummary(data: ImprovementsData): string {
    const lines: string[] = [];

    if (data.recommendations?.length) {
      lines.push('Рекомендации по развитию:');
      for (const r of data.recommendations) {
        lines.push(`\n${r.title}`);
        lines.push(r.description);
      }
      lines.push('');
    }

    if (data.project_ideas?.length) {
      lines.push('Идеи для проектов:');
      for (const p of data.project_ideas) {
        lines.push(`\n${p.title}`);
        lines.push(p.description);
        if (p.stack?.length) lines.push(`Стек: ${p.stack.join(', ')}`);
        if (p.benefit) lines.push(`Польза: ${p.benefit}`);
      }
    }

    return lines.join('\n');
  }
}
