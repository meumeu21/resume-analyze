import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ExportService, PDF_EXPORT_QUEUE } from './export.service';

export interface PdfJobData {
  userId: string;
  requesterId: string;
}

@Processor(PDF_EXPORT_QUEUE)
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(private readonly exportService: ExportService) {
    super();
  }

  async process(job: Job<PdfJobData>): Promise<string> {
    this.logger.log(`Processing PDF job ${job.id} for user ${job.data.userId}`);
    const buffer = await this.exportService.generateProfileResume(
      job.data.userId,
      job.data.requesterId,
    );
    return buffer.toString('base64');
  }
}
