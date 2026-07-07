import { Module } from '@nestjs/common';

import { EmbeddingModule } from '@/embed/embed.module';
import { KeywordSearchService } from '@/rag/keyword-search.service';
import { VectorModule } from '@/vector/vector.module';

import { DocumentLoader } from './document-loader.service';
import { DocumentUploadService } from './document-upload.service';
import { DocumentController } from './document.controller';

@Module({
  imports: [EmbeddingModule, VectorModule],
  controllers: [DocumentController],
  providers: [DocumentLoader, DocumentUploadService, KeywordSearchService],
  exports: [DocumentLoader],
})
export class DocumentModule {}
