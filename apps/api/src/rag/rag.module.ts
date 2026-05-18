import { Module } from '@nestjs/common';

import { EmbeddingModule } from '@/embed/embed.module';
import { KeywordSearchService } from '@/rag/keyword-search.service';
import { RAGService } from '@/rag/rag.service';
import { VectorModule } from '@/vector/vector.module';

@Module({
  imports: [EmbeddingModule, VectorModule],
  providers: [KeywordSearchService, RAGService],
  exports: [RAGService],
})
export class RagModule {}
