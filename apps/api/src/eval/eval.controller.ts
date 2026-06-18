import { Controller, Get, Post } from '@nestjs/common';

import { EvalService } from './eval.service';

@Controller('api/eval')
export class EvalController {
  constructor(private readonly evalService: EvalService) {}

  @Get('runs')
  getRuns() {
    return this.evalService.getRuns();
  }

  @Post('run')
  async runEval() {
    try {
      return await this.evalService.runEval();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`评估运行失败: ${message}`);
    }
  }
}
