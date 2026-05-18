import { Module } from '@nestjs/common';

import { createEmbeddingConfig, EMBEDDING_CONFIG } from '@/embed/embed.config';
import { EmbeddingService } from '@/embed/embed.service';

@Module({
  providers: [
    {
      provide: EMBEDDING_CONFIG,
      useFactory: createEmbeddingConfig,
    },
    EmbeddingService,
  ],
  exports: [EmbeddingService, EMBEDDING_CONFIG],
})
export class EmbeddingModule {}
