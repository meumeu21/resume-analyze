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
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletion } from 'openai/resources';
import { Repository } from 'typeorm';

import {
  AiReport, Profile, Project, ReportStatus, ReportType, User,
} from '../database/entities';
import { GithubRepo } from '../database/entities/github-repo.entity';
import { PagedResult, PaginationDto } from '../common/dto/pagination.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AI_REPORTS_QUEUE } from './ai.constants';
import { ResumeData, ImprovementsData } from './ai.types';
import {
  systemPrompt,
  resumeSystemPrompt,
  buildPrompt,
  buildResumePrompt,
  buildImprovementsPrompt,
  buildCoordinatesPrompt,
  buildInterestGraphPrompt,
} from './ai.prompts';
import { extractJson, formatResumeSummary, formatImprovementsSummary } from './ai.utils';

export { AI_REPORTS_QUEUE } from './ai.constants';
export { DEVELOPER_CATEGORIES } from './ai.constants';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI;
  private readonly generatingProjects = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(AiReport) private readonly reportRepo: Repository<AiReport>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(GithubRepo) private readonly githubRepoRepo: Repository<GithubRepo>,
    @InjectQueue(AI_REPORTS_QUEUE) private readonly aiQueue: Queue,
  ) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('MISTRAL_API_KEY'),
      baseURL: 'https://api.mistral.ai/v1',
    });
  }

  private async callAI(params: ChatCompletionCreateParamsNonStreaming): Promise<ChatCompletion> {
    const start = Date.now();
    try {
      const result = await this.client.chat.completions.create(params);
      this.logger.log(`Gemini OK (${Date.now() - start}ms)`);
      return result;
    } catch (err: any) {
      this.logger.error(`Gemini failed (${Date.now() - start}ms): ${err?.message}`);
      throw err;
    }
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

    if (report.reportType === ReportType.COORDINATES) {
      await this.processCoordinatesReport(report, profile);
      return;
    }

    if (report.reportType === ReportType.SKILL_MAP) {
      await this.processSkillMapReport(report, profile);
      return;
    }

    if (report.reportType === ReportType.NETWORK_GRAPH) {
      await this.processNetworkGraphReport(report, profile);
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
      const prompt = buildPrompt(report.reportType, profile, project, githubRepo, allProjects);
      const completion = await this.callAI({
        model: 'mistral-small-latest',
        max_tokens: 1500,
        messages: [
          { role: 'system', content: systemPrompt() },
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
      const prompt = buildResumePrompt(profile, publicProjects);
      const completion = await this.callAI({
        model: 'mistral-small-latest',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: resumeSystemPrompt() },
          { role: 'user', content: prompt },
        ],
      });

      const rawText = completion.choices[0]?.message?.content ?? '';
      const resumeData: ResumeData = JSON.parse(extractJson(rawText));

      report.status = ReportStatus.DONE;
      report.rawResponse = resumeData as unknown as Record<string, unknown>;
      report.summary = formatResumeSummary(resumeData);
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
      const prompt = buildImprovementsPrompt(profile, allProjects);
      const completion = await this.callAI({
        model: 'mistral-small-latest',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt() },
          { role: 'user', content: prompt },
        ],
      });

      const rawText = completion.choices[0]?.message?.content ?? '';
      const data: ImprovementsData = JSON.parse(extractJson(rawText));

      report.status = ReportStatus.DONE;
      report.rawResponse = data as unknown as Record<string, unknown>;
      report.summary = formatImprovementsSummary(data);
    } catch (err) {
      report.status = ReportStatus.ERROR;
      report.errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      this.logger.error(`Improvements report ${report.id} failed: ${report.errorMessage}`);
    }

    await this.reportRepo.save(report);
    this.logger.log(`Improvements report ${report.id} finished with status ${report.status}`);
  }

  private async processCoordinatesReport(report: AiReport, profile: Profile): Promise<void> {
    const allProjects = await this.projectRepo.find({ where: { userId: report.userId } });

    try {
      const prompt = buildCoordinatesPrompt(profile, allProjects);
      const completion = await this.callAI({
        model: 'mistral-small-latest',
        max_tokens: 1500,
        messages: [
          { role: 'system', content: 'Ты аналитик IT-специализаций. Отвечай ТОЛЬКО JSON-объектом без markdown и пояснений.' },
          { role: 'user', content: prompt },
        ],
      });

      const rawText = completion.choices[0]?.message?.content ?? '';
      const coords: { x: number; y: number } = JSON.parse(extractJson(rawText));

      const x = Math.max(-5, Math.min(5, Number(coords.x)));
      const y = Math.max(-5, Math.min(5, Number(coords.y)));

      profile.coordinates = { x, y };
      await this.profileRepo.save(profile);

      report.status = ReportStatus.DONE;
      report.rawResponse = { x, y } as unknown as Record<string, unknown>;
      report.summary = `x: ${x}, y: ${y}`;
    } catch (err) {
      report.status = ReportStatus.ERROR;
      report.errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      this.logger.error(`Coordinates report ${report.id} failed: ${report.errorMessage}`);
    }

    await this.reportRepo.save(report);
    this.logger.log(`Coordinates report ${report.id} finished with status ${report.status}`);
  }

  private async processSkillMapReport(report: AiReport, profile: Profile): Promise<void> {
    const skills = profile.hardSkills.map((s) => ({
      name: s.name,
      value: s.level,
    }));

    profile.skillMap = skills;
    await this.profileRepo.save(profile);

    report.status = ReportStatus.DONE;
    report.rawResponse = { skills } as unknown as Record<string, unknown>;
    report.summary = skills.map((s) => `${s.name}: ${s.value}`).join(', ');
    await this.reportRepo.save(report);
    this.logger.log(`SkillMap report ${report.id} finished with status ${report.status}`);
  }

  private async processNetworkGraphReport(report: AiReport, profile: Profile): Promise<void> {
    const allProjects = await this.projectRepo.find({ where: { userId: report.userId } });

    if (!allProjects.length) {
      report.status = ReportStatus.ERROR;
      report.errorMessage = 'Нет проектов для построения графа';
      await this.reportRepo.save(report);
      return;
    }

    const githubRepoIds = allProjects.map((p) => p.githubRepoId).filter((id): id is string => !!id);
    const githubRepos = githubRepoIds.length
      ? await this.githubRepoRepo.find({ where: githubRepoIds.map((id) => ({ id })) })
      : [];
    const githubRepoMap = new Map(githubRepos.map((r) => [r.id, r]));

    const projectsInfo = allProjects.map((p) => {
      const repo = p.githubRepoId ? githubRepoMap.get(p.githubRepoId) : null;
      const description = p.description ? p.description.slice(0, 150) : '';
      const readme = repo?.readmeExcerpt ? repo.readmeExcerpt.slice(0, 200) : '';
      const context = [description, readme].filter(Boolean).join(' ');
      return `— ${p.title}${context ? `\n  ${context}` : ''}`;
    }).join('\n\n');

    try {
      const completion = await this.callAI({
        model: 'mistral-small-latest',
        max_tokens: 4096,
        messages: [
          {
            role: 'system',
            content: 'Ты аналитик интересов IT-разработчика. Отвечай ТОЛЬКО валидным компактным JSON одной строкой без markdown и пояснений.',
          },
          { role: 'user', content: buildInterestGraphPrompt(projectsInfo) },
        ],
      });

      const rawText = completion.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(extractJson(rawText));

      let resolvedData: { nodes: unknown; edges: unknown } = parsed;
      if (!Array.isArray(parsed?.nodes) && parsed && typeof parsed === 'object') {
        for (const val of Object.values(parsed)) {
          if (val && typeof val === 'object' && Array.isArray((val as { nodes?: unknown }).nodes)) {
            resolvedData = val as { nodes: unknown; edges: unknown };
            break;
          }
        }
      }
      if (!Array.isArray(resolvedData?.nodes)) {
        throw new Error('Неожиданная структура JSON от AI');
      }

      const data = resolvedData as {
        nodes: { id: string; label: string; type: 'technology' | 'domain'; weight: number }[];
        edges: { source: string; target: string }[];
      };

      const nodeIds = new Set(data.nodes.map((n) => n.id));
      const nodes = data.nodes.map((n) => ({
        id: String(n.id),
        label: String(n.label),
        type: n.type === 'domain' ? ('domain' as const) : ('technology' as const),
        weight: Math.max(1, Math.min(5, Number(n.weight) || 1)),
      }));
      const edges = (Array.isArray(data.edges) ? data.edges : [])
        .filter((e) => e && nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target)
        .map((e) => ({ source: String(e.source), target: String(e.target) }));

      profile.networkGraph = { nodes, edges };
      await this.profileRepo.save(profile);

      report.status = ReportStatus.DONE;
      report.rawResponse = { nodes, edges } as unknown as Record<string, unknown>;
      report.summary = `${nodes.length} узлов, ${edges.length} связей`;
    } catch (err) {
      report.status = ReportStatus.ERROR;
      report.errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      this.logger.error(`NetworkGraph report ${report.id} failed: ${report.errorMessage}`);
    }

    await this.reportRepo.save(report);
    this.logger.log(`NetworkGraph report ${report.id} finished with status ${report.status}`);
  }

  async ensurePublicProjectSummary(projectId: string): Promise<AiReport | null> {
    const project = await this.projectRepo.findOne({ where: { id: projectId, isPublic: true } });
    if (!project) throw new NotFoundException('Проект не найден или не является публичным');

    const existing = await this.reportRepo.findOne({
      where: { projectId, reportType: ReportType.PROJECT_SUMMARY, isPublic: true, status: ReportStatus.DONE },
      order: { createdAt: 'DESC' },
    });
    if (existing) return existing;

    if (this.generatingProjects.has(projectId)) return null;
    this.generatingProjects.add(projectId);

    const profile = await this.profileRepo.findOne({ where: { userId: project.userId } });
    const githubRepo = project.githubRepoId
      ? await this.githubRepoRepo.findOne({ where: { id: project.githubRepoId } })
      : null;

    const safeProfile = profile ?? ({ hardSkills: [], softSkills: [], bio: null, activityField: null } as unknown as Profile);
    const prompt = buildPrompt(ReportType.PROJECT_SUMMARY, safeProfile, project, githubRepo, []);

    let completion: Awaited<ReturnType<typeof this.callAI>>;
    try {
      completion = await this.callAI({
        model: 'mistral-small-latest',
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt() },
          { role: 'user', content: prompt },
        ],
      });
    } catch (err: any) {
      this.generatingProjects.delete(projectId);
      throw err;
    }

    this.generatingProjects.delete(projectId);
    const text = completion.choices[0]?.message?.content ?? '';

    return this.reportRepo.save(
      this.reportRepo.create({
        userId: project.userId,
        projectId: project.id,
        reportType: ReportType.PROJECT_SUMMARY,
        status: ReportStatus.DONE,
        summary: text,
        rawResponse: completion as unknown as Record<string, unknown>,
        isPublic: true,
      }),
    );
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

  async markReportFailed(reportId: string, errorMessage: string): Promise<void> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report || report.status !== ReportStatus.PENDING) return;
    report.status = ReportStatus.ERROR;
    report.errorMessage = errorMessage;
    await this.reportRepo.save(report);
    this.logger.warn(`Report ${reportId} marked as failed after all retries: ${errorMessage}`);
  }
}
