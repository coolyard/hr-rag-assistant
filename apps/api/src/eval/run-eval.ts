import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';

import { EvalService } from './eval.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const evalService = app.get(EvalService);

  console.log('Starting evaluation...\n');
  const runId = await evalService.createRun();
  console.log(`Started: ${runId}`);

  // Poll until complete
  const poll = async (): Promise<void> => {
    const runs = await evalService.getRuns();
    const run = runs.find((r) => r.id === runId);
    if (!run) {
      console.log('Run not found');
      await app.close();
      return;
    }
    if (run.status === 'completed') {
      console.log(`\nEvaluation complete!`);
      console.log(`  Avg Accuracy: ${run.averageAccuracy.toFixed(2)}`);
      console.log(`  Avg Completeness: ${run.averageCompleteness.toFixed(2)}`);
      console.log(`  Avg Relevance: ${run.averageRelevance.toFixed(2)}`);
      console.log(`  Rejection Rate: ${(run.rejectionRate * 100).toFixed(1)}%`);
      await app.close();
    } else {
      console.log(`Progress: ${String(run.completedCount)}/${String(run.totalQuestions)}`);
      setTimeout(() => {
        void poll();
      }, 2000);
    }
  };

  void poll();
}

void bootstrap();
