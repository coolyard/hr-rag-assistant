import { Module } from '@nestjs/common';

import { RagModule } from '@/rag/rag.module';

import { EvalJudgeService } from './eval-judge.service';
import { EvalController } from './eval.controller';
import { EvalService } from './eval.service';

@Module({
  controllers: [EvalController],
  imports: [RagModule],
  providers: [EvalService, EvalJudgeService],
})
export class EvalModule {}
