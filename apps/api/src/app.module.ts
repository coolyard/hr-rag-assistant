import { Module } from '@nestjs/common';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { DocumentModule } from '@/document/document.module';
import { EmbeddingModule } from '@/embed/embed.module';
import { HealthModule } from '@/health/health.module';
import { RagModule } from '@/rag/rag.module';
import { VectorModule } from '@/vector/vector.module';

@Module({
  imports: [DocumentModule, EmbeddingModule, HealthModule, RagModule, VectorModule],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {}
