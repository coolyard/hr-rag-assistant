import { Module } from '@nestjs/common';

import { AskController } from '@/ask/ask.controller';
import { ChatModule } from '@/chat/chat.module';
import { RagModule } from '@/rag/rag.module';

@Module({
  imports: [RagModule, ChatModule],
  controllers: [AskController],
})
export class AskModule {}
