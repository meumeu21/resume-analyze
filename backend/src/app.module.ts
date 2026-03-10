import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import githubConfig from './config/github.config';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { DatabaseEntitiesModule } from './database/database-entities.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { ExportModule } from './export/export.module';
import { GithubModule } from './github/github.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, githubConfig],
      validate,
    }),

    DatabaseModule,
    DatabaseEntitiesModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ExportModule,
    GithubModule,
    // AiModule,
  ],
})
export class AppModule {}