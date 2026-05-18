import { Module } from '@nestjs/common';

import { EmbeddingModule } from '@/embed/embed.module';
import { HealthController } from '@/health/health.controller';
import { LLMModule } from '@/llm/llm.module';

@Module({
  imports: [LLMModule, EmbeddingModule],
  controllers: [HealthController],
})
export class HealthModule {}
