import { Module } from '@nestjs/common';

import { VectorStoreService } from '@/vector/vector-store.service';

@Module({
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorModule {}
