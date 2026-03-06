import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { DatabaseEntitiesModule } from './database/database-entities.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validate,
    }),

    DatabaseModule,
    DatabaseEntitiesModule,
    // AuthModule,
    // UsersModule,
    // ProjectsModule,
    // GithubModule,
    // AiModule,
    // ExportModule,
  ],
})
export class AppModule {}