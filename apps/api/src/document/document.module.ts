import { Module } from '@nestjs/common';

import { EmbeddingModule } from '@/embed/embed.module';
import { VectorModule } from '@/vector/vector.module';

import { DocumentLoader } from './document-loader.service';
import { DocumentUploadService } from './document-upload.service';

@Module({
  imports: [EmbeddingModule, VectorModule],
  providers: [DocumentLoader, DocumentUploadService],
  exports: [DocumentLoader],
})
export class DocumentModule {}
