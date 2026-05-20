import { Module } from '@nestjs/common';

import { createLLMConfig, LLM_CONFIG } from '@/llm/llm.config';
import { LLMService } from '@/llm/llm.service';

@Module({
  providers: [
    {
      provide: LLM_CONFIG,
      useFactory: createLLMConfig,
    },
    LLMService,
  ],
  exports: [LLMService, LLM_CONFIG],
})
export class LLMModule {}
