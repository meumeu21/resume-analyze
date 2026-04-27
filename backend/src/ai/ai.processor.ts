import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AI_REPORTS_QUEUE, AiService } from './ai.service';

@Processor(AI_REPORTS_QUEUE, { concurrency: 2 })
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly aiService: AiService) {
    super();
  }

  async process(job: Job<{ reportId: string }>): Promise<void> {
    const { reportId } = job.data;
    this.logger.log(`Ии-отчет с ${job.id}, reportId=${reportId}`);

    try {
      await this.aiService.processReport(reportId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ии-отчет ${job.id} не получился (попытка ${job.attemptsMade + 1}): ${message}`);
      throw err;
    }
  }
}
