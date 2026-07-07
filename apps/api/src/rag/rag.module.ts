import { Module } from '@nestjs/common';

import { ChatModule } from '@/chat/chat.module';
import { EmbeddingModule } from '@/embed/embed.module';
import { LLMModule } from '@/llm/llm.module';
import { KeywordSearchService } from '@/rag/keyword-search.service';
import { QueryClassifier } from '@/rag/query-classifier';
import { RAGService } from '@/rag/rag.service';
import { ToolModule } from '@/tool/tool.module';
import { UserProfileModule } from '@/user-profile/user-profile.module';
import { VectorModule } from '@/vector/vector.module';

@Module({
  imports: [EmbeddingModule, VectorModule, LLMModule, ChatModule, ToolModule, UserProfileModule],
  providers: [KeywordSearchService, QueryClassifier, RAGService],
  exports: [RAGService],
})
export class RagModule {}
