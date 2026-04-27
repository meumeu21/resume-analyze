import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { ExportService, PDF_EXPORT_QUEUE } from './export.service';
import { PdfJobData } from './export.processor';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    @InjectQueue(PDF_EXPORT_QUEUE) private readonly pdfQueue: Queue,
  ) {}

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

  @Post('resume/:userId')
  async queueResume(
    @Param('userId') userId: string,
    @CurrentUser() user: User,
  ) {
    const job = await this.pdfQueue.add('generate-pdf', {
      userId,
      requesterId: user.id,
    } satisfies PdfJobData);
    return { jobId: job.id };
  }

  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.pdfQueue.getJob(jobId);
    if (!job) throw new NotFoundException('Задача не найдена');

    const state = await job.getState();
    return {
      jobId: job.id,
      status: state,
      ...(state === 'failed' ? { error: job.failedReason } : {}),
    };
  }

  @Get('jobs/:jobId/file')
  async downloadJobFile(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const job = await this.pdfQueue.getJob(jobId);
    if (!job) throw new NotFoundException('Задача не найдена');

    const state = await job.getState();
    if (state !== 'completed') {
      throw new BadRequestException(`PDF ещё не готов, статус: ${state}`);
    }

    const buffer = Buffer.from(job.returnvalue as string, 'base64');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

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
