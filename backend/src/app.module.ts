import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

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
import { AiModule } from './ai/ai.module';
import { VisualizationModule } from './visualization/visualization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, githubConfig],
      validate,
    }),

    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const raw = config.get<string>('REDIS_URL')!;
        const url = new URL(raw);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
          },
        };
      },
      inject: [ConfigService],
    }),

    DatabaseModule,
    DatabaseEntitiesModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ExportModule,
    GithubModule,
    AiModule,
    VisualizationModule,
  ],
})
export class AppModule {}