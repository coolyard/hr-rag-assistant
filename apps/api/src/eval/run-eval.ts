import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';

import { EvalService } from './eval.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const evalService = app.get(EvalService);

  console.log('Starting evaluation...\n');
  const run = await evalService.runEval();
  console.log(`Evaluation complete: ${run.id}`);
  console.log(`  Questions: ${String(run.totalQuestions)}`);
  console.log(`  Avg Accuracy: ${run.averageAccuracy.toFixed(2)}`);
  console.log(`  Avg Completeness: ${run.averageCompleteness.toFixed(2)}`);
  console.log(`  Avg Relevance: ${run.averageRelevance.toFixed(2)}`);
  console.log(`  Rejection Rate: ${(run.rejectionRate * 100).toFixed(1)}%`);

  await app.close();
}

void bootstrap();
