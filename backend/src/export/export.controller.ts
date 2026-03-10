import {
  Controller, Get, Param,
  Res, UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { ExportService } from './export.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // Скачать резюме профиля (своего или чужого публичного)
  @Get('resume/:userId')
  async downloadResume(
    @Param('userId') userId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.generateProfileResume(userId, user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // Скачать пустой шаблон для заполнения вручную
  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.exportService.generateBlankTemplate();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume-template.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
