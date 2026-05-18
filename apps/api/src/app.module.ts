import { Module } from '@nestjs/common';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ChatModule } from '@/chat/chat.module';
import { DocumentModule } from '@/document/document.module';
import { EmbeddingModule } from '@/embed/embed.module';
import { HealthModule } from '@/health/health.module';
import { LLMModule } from '@/llm/llm.module';
import { RagModule } from '@/rag/rag.module';
import { VectorModule } from '@/vector/vector.module';

@Module({
  imports: [
    ChatModule,
    DocumentModule,
    EmbeddingModule,
    HealthModule,
    LLMModule,
    RagModule,
    VectorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {}
