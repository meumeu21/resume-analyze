import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GithubAccount, GithubRepo } from '../database/entities';
import { RedisService } from '../redis/redis.service';

const ACCOUNT_TTL = 600;   // 10 минут
const REPO_TTL = 1800;     // 30 минут

const cacheKey = {
  account: (userId: string) => `github:account:${userId}`,
  repo: (owner: string, name: string) => `github:repo:${owner}/${name}`,
};

interface GithubRepoResponse {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  topics: string[];
  stargazers_count: number;
  fork: boolean;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly baseUrl = 'https://api.github.com';

  constructor(
    @InjectRepository(GithubAccount)
    private readonly accountRepo: Repository<GithubAccount>,
    @InjectRepository(GithubRepo)
    private readonly repoRepo: Repository<GithubRepo>,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  // POST /github/connect
  async connect(userId: string, username: string) {
    const ghUser = await this.githubFetch<{ login: string }>(
      `/users/${username}`,
    ).catch(() => {
      throw new NotFoundException(`GitHub пользователь "${username}" не найден`);
    });

    const existingByUsername = await this.accountRepo.findOne({
      where: { githubUsername: ghUser.login },
    });
    if (existingByUsername && existingByUsername.userId !== userId) {
      throw new ConflictException('Этот GitHub аккаунт уже привязан к другому пользователю');
    }

    // upsert аккаунта
    let account = await this.accountRepo.findOne({ where: { userId } });
    if (account) {
      account.githubUsername = ghUser.login;
      account.cachedAt = null;
    } else {
      account = this.accountRepo.create({ userId, githubUsername: ghUser.login });
    }
    await this.accountRepo.save(account);

    await this.syncRepos(userId);

    return this.accountRepo.findOne({
      where: { userId },
      relations: ['repos'],
    });
  }

  private async invalidateAccountCache(userId: string) {
    await this.redis.del(cacheKey.account(userId));
  }

  // POST /github/sync
  async syncRepos(userId: string) {
    const account = await this.accountRepo.findOne({ where: { userId } });
    if (!account) throw new NotFoundException('GitHub аккаунт не привязан');

    const username = account.githubUsername;

    const repos = await this.fetchAllRepos(username);
    const ownRepos = repos.filter((r) => !r.fork);

    const saved: GithubRepo[] = [];

    for (const repo of ownRepos) {
      const [languages, readmeExcerpt] = await Promise.all([
        this.fetchLanguages(username, repo.name),
        this.fetchReadmeExcerpt(username, repo.name),
      ]);

      // upsert по githubRepoId
      await this.repoRepo.upsert(
        {
          githubAccountId: account.id,
          githubRepoId: repo.id,
          name: repo.name,
          description: repo.description,
          url: repo.html_url,
          languages,
          topics: repo.topics ?? [],
          starsCount: repo.stargazers_count,
          isFork: repo.fork,
          readmeExcerpt,
          cachedAt: new Date(),
        },
        { conflictPaths: ['githubRepoId'] },
      );

      saved.push(
        await this.repoRepo.findOne({ where: { githubRepoId: repo.id } }) as GithubRepo,
      );
    }

    account.cachedAt = new Date();
    await this.accountRepo.save(account);

    await this.invalidateAccountCache(userId);

    this.logger.log(`Синхронизировано ${saved.length} репозиториев для ${username}`);
    return saved;
  }

  // GET /github/account
  async getMyAccount(userId: string) {
    const cached = await this.redis.get<GithubAccount>(cacheKey.account(userId));
    if (cached) return cached;

    const account = await this.accountRepo.findOne({
      where: { userId },
      relations: ['repos'],
    });
    if (!account) throw new NotFoundException('GitHub аккаунт не привязан');

    await this.redis.set(cacheKey.account(userId), account, ACCOUNT_TTL);
    return account;
  }

  // DELETE /github/disconnect
  async disconnect(userId: string) {
    const account = await this.accountRepo.findOne({ where: { userId } });
    if (!account) throw new NotFoundException('GitHub аккаунт не привязан');
    await this.accountRepo.remove(account);
    await this.invalidateAccountCache(userId);
  }

  async fetchRepoByUrl(repoUrl: string): Promise<GithubRepo> {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
    if (!match) {
      throw new BadRequestException('Некорректный URL репозитория GitHub');
    }
    const [, owner, repoName] = match;

    const cached = await this.redis.get<GithubRepo>(cacheKey.repo(owner, repoName));
    if (cached) return cached;

    const [repoData, languages, readmeExcerpt] = await Promise.all([
      this.githubFetch<GithubRepoResponse>(`/repos/${owner}/${repoName}`).catch(() => {
        throw new NotFoundException(`Репозиторий ${owner}/${repoName} не найден`);
      }),
      this.fetchLanguages(owner, repoName),
      this.fetchReadmeExcerpt(owner, repoName),
    ]);

    await this.repoRepo.upsert(
      {
        githubAccountId: null,
        githubRepoId: repoData.id,
        name: repoData.name,
        description: repoData.description,
        url: repoData.html_url,
        languages,
        topics: repoData.topics ?? [],
        starsCount: repoData.stargazers_count,
        isFork: repoData.fork,
        readmeExcerpt,
        cachedAt: new Date(),
      },
      { conflictPaths: ['githubRepoId'] },
    );

    const repo = await this.repoRepo.findOne({ where: { githubRepoId: repoData.id } }) as GithubRepo;
    await this.redis.set(cacheKey.repo(owner, repoName), repo, REPO_TTL);
    return repo;
  }

  // github api helpers

  private getHeaders(): HeadersInit {
    const token = this.config.get<string | null>('github.token');
    return {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async githubFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new BadRequestException(`GitHub API error: ${res.status} ${path}`);
    }

    return res.json() as Promise<T>;
  }

  private async fetchAllRepos(username: string): Promise<GithubRepoResponse[]> {
    const all: GithubRepoResponse[] = [];
    let page = 1;

    while (true) {
      const repos = await this.githubFetch<GithubRepoResponse[]>(
        `/users/${username}/repos?per_page=100&page=${page}&sort=updated`,
      );

      if (!repos.length) break;
      all.push(...repos);

      if (repos.length < 100) break;
      page++;
    }

    return all;
  }

  private async fetchLanguages(
    owner: string,
    repo: string,
  ): Promise<Record<string, number>> {
    try {
      return await this.githubFetch<Record<string, number>>(
        `/repos/${owner}/${repo}/languages`,
      );
    } catch {
      return {};
    }
  }

  private async fetchReadmeExcerpt(
    owner: string,
    repo: string,
  ): Promise<string | null> {
    try {
      const data = await this.githubFetch<{ content: string; encoding: string }>(
        `/repos/${owner}/${repo}/readme`,
      );

      if (data.encoding === 'base64') {
        const text = Buffer.from(data.content, 'base64').toString('utf-8');
        // убираем markdown-разметку и берём первые 500 символов
        return text.replace(/[#*`[\]>-]/g, '').trim().slice(0, 500) || null;
      }

      return null;
    } catch {
      return null;
    }
  }
}