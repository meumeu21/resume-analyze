import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AI_REPORTS_QUEUE, AiService } from './ai.service';

@Processor(AI_REPORTS_QUEUE)
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly aiService: AiService) {
    super();
  }

  async process(job: Job<{ reportId: string }>): Promise<void> {
    this.logger.log(`Processing AI report job ${job.id}, reportId=${job.data.reportId}`);
    await this.aiService.processReport(job.data.reportId);
  }
}
