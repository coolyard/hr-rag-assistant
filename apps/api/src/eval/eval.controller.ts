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
    return this.evalService.runEval();
  }
}
