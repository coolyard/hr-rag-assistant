import { Controller, Get, Post } from '@nestjs/common';

import { EvalService } from './eval.service';

@Controller('api/eval')
export class EvalController {
  constructor(private readonly evalService: EvalService) {}

  @Get('runs')
  getRuns() {
    return this.evalService.getRuns();
  }

  @Get('status')
  async getStatus() {
    const runs = await this.evalService.getRuns();
    const runningRun = runs.find((r: { status: string }) => r.status === 'running');
    if (!runningRun) {
      return { status: 'idle' };
    }
    return {
      status: runningRun.status,
      completedCount: (runningRun as { completedCount: number }).completedCount,
      totalQuestions: (runningRun as { totalQuestions: number }).totalQuestions,
    };
  }

  @Post('run')
  async runEval() {
    const runId = await this.evalService.createRun();
    return { runId };
  }
}
