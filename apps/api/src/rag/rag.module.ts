import { Module } from '@nestjs/common';

import { ChatModule } from '@/chat/chat.module';
import { EmbeddingModule } from '@/embed/embed.module';
import { LLMModule } from '@/llm/llm.module';
import { KeywordSearchService } from '@/rag/keyword-search.service';
import { RAGService } from '@/rag/rag.service';
import { VectorModule } from '@/vector/vector.module';

@Module({
  imports: [EmbeddingModule, VectorModule, LLMModule, ChatModule],
  providers: [KeywordSearchService, RAGService],
  exports: [RAGService],
})
export class RagModule {}
