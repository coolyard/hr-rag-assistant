import { Module } from '@nestjs/common';

import { EvalJudgeService } from './eval-judge.service';
import { EvalController } from './eval.controller';
import { EvalService } from './eval.service';

@Module({
  controllers: [EvalController],
  providers: [EvalService, EvalJudgeService],
})
export class EvalModule {}
