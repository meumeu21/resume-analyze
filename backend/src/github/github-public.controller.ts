import { Controller, Get, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { GithubService } from './github.service';

@SkipThrottle({ auth: true })
@Controller('github/public')
export class GithubPublicController {
  constructor(private readonly githubService: GithubService) {}

  @Get('repos/:repoId/contents')
  getContents(
    @Param('repoId') repoId: string,
    @Query('path') path = '',
  ) {
    return this.githubService.getRepoContents(repoId, path);
  }
}
