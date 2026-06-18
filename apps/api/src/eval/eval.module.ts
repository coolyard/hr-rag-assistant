import { Module } from '@nestjs/common';

import { LLMModule } from '@/llm/llm.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RagModule } from '@/rag/rag.module';

import { EvalJudgeService } from './eval-judge.service';
import { EvalController } from './eval.controller';
import { EvalService } from './eval.service';

@Module({
  controllers: [EvalController],
  imports: [RagModule, LLMModule, PrismaModule],
  providers: [EvalService, EvalJudgeService],
})
export class EvalModule {}
